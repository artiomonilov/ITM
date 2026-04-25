import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import Resource from '@/models/Resource';
import ResourceInventory from '@/models/ResourceInventory';
import ResourceRequest from '@/models/ResourceRequest';
import User from '@/models/User';
import { createSubscriptionCredentialSet } from '@/lib/resourceService';
import { sendSubscriptionCredentialsEmail } from '@/lib/mailer';
import { logAuditEvent } from '@/lib/audit';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'Admin') {
    return null;
  }

  return session;
}

async function getOrCreateInventory() {
  let inventory = await ResourceInventory.findOne();
  if (!inventory) {
    inventory = await ResourceInventory.create({ totalTokens: 0, totalSubscriptions: 0 });
  }

  return inventory;
}

async function calculateUsage() {
  const allocations = await Resource.aggregate([
    {
      $group: {
        _id: '$type',
        total: { $sum: '$quantity' },
      },
    },
  ]);

  const summary = {
    TOKEN: 0,
    SUBSCRIPTION: 0,
  };

  allocations.forEach((entry) => {
    summary[entry._id] = entry.total;
  });

  return summary;
}

async function buildResponse() {
  const inventory = await getOrCreateInventory();
  const usage = await calculateUsage();
  const requests = await ResourceRequest.find()
    .populate('professorId', 'nume prenume email')
    .populate('studentId', 'nume prenume email')
    .populate('courseId', 'name maxStudents resourceRequirements')
    .sort({ createdAt: -1 });

  const courses = await Course.find()
    .populate('teacher', 'nume prenume email')
    .populate('students', 'nume prenume email')
    .sort({ createdAt: -1 });

  const professors = await User.find({ role: 'Profesor' }).select('nume prenume email');

  return {
    inventory,
    usage,
    requests,
    courses,
    professors,
  };
}

async function getCourseSetupPlan(courseId) {
  const course = await Course.findById(courseId)
    .populate('students', 'nume prenume email')
    .select('name students resourceRequirements')
    .lean();

  if (!course) {
    return null;
  }

  return {
    course,
    students: course.students || [],
    tokenPerStudent: course.resourceRequirements?.tokenPerStudent || 0,
    subscriptionPerStudent: course.resourceRequirements?.subscriptionPerStudent || 0,
  };
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Restrictionat: doar administratorii au acces.' }, { status: 403 });
    }

    await connectDB();
    return NextResponse.json(await buildResponse());
  } catch (error) {
    console.error('Eroare GET admin resources:', error);
    return NextResponse.json({ message: error?.message || 'Eroare interna la incarcare.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Restrictionat: doar administratorii au acces.' }, { status: 403 });
    }

    await connectDB();
    const payload = await req.json();

    if (payload.action === 'updateTotals') {
      const inventory = await getOrCreateInventory();
      inventory.totalTokens = Math.max(0, Number(payload.totalTokens) || 0);
      inventory.totalSubscriptions = Math.max(0, Number(payload.totalSubscriptions) || 0);
      await inventory.save();

      await logAuditEvent({
        actorId: session.user.id,
        actorEmail: session.user.email,
        actorRole: session.user.role,
        action: 'ADMIN_UPDATE_RESOURCE_TOTALS',
        targetType: 'ResourceInventory',
        details: 'Administratorul a actualizat totalul resurselor universitatii.',
        status: 'SUCCESS',
        metadata: {
          totalTokens: inventory.totalTokens,
          totalSubscriptions: inventory.totalSubscriptions,
        },
      });

      return NextResponse.json({
        message: 'Inventarul universitatii a fost actualizat.',
        data: await buildResponse(),
      });
    }

    if (payload.action === 'forwardExtraRequest') {
      const { courseId, professorId, studentId, type, quantity, reason } = payload;
      if (!courseId || !professorId || !type || !quantity) {
        return NextResponse.json({ message: 'Date insuficiente pentru cererea suplimentara.' }, { status: 400 });
      }

      const request = await ResourceRequest.create({
        courseId,
        professorId,
        studentId: studentId || null,
        type,
        quantity: Number(quantity),
        scope: 'EXTRA_STUDENT',
        reason: reason || 'Cerere suplimentara inaintata de profesor catre administrator.',
      });

      await logAuditEvent({
        actorId: session.user.id,
        actorEmail: session.user.email,
        actorRole: session.user.role,
        action: 'ADMIN_FORWARD_EXTRA_REQUEST',
        targetType: 'ResourceRequest',
        targetId: request._id.toString(),
        targetLabel: type,
        details: 'A fost inregistrata o cerere suplimentara pentru aprobare.',
        status: 'SUCCESS',
      });

      return NextResponse.json({
        message: 'Cererea suplimentara a fost inregistrata.',
        request,
        data: await buildResponse(),
      }, { status: 201 });
    }

    return NextResponse.json({ message: 'Actiune necunoscuta.' }, { status: 400 });
  } catch (error) {
    console.error('Eroare POST admin resources:', error);
    return NextResponse.json({ message: error?.message || 'Eroare interna la salvare.' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Restrictionat: doar administratorii au acces.' }, { status: 403 });
    }

    await connectDB();
    const { requestId, decision } = await req.json();

    const request = await ResourceRequest.findById(requestId)
      .populate('professorId', 'nume prenume email')
      .populate('courseId', 'name');

    if (!request) {
      return NextResponse.json({ message: 'Cererea nu a fost gasita.' }, { status: 404 });
    }

    if (request.status !== 'PENDING') {
      return NextResponse.json({ message: 'Cererea a fost deja procesata.' }, { status: 400 });
    }

    if (decision === 'REJECTED') {
      request.status = 'REJECTED';
      request.rejectedAt = new Date();
      await request.save();

      await logAuditEvent({
        actorId: session.user.id,
        actorEmail: session.user.email,
        actorRole: session.user.role,
        action: 'ADMIN_REJECT_RESOURCE_REQUEST',
        targetType: 'ResourceRequest',
        targetId: request._id.toString(),
        targetLabel: request.type,
        details: `Cerere respinsa pentru cursul ${request.courseId.name}.`,
        status: 'SUCCESS',
      });

      return NextResponse.json({
        message: 'Cererea a fost respinsa.',
        data: await buildResponse(),
      });
    }

    if (decision !== 'APPROVED') {
      return NextResponse.json({ message: 'Decizie invalida.' }, { status: 400 });
    }

    const inventory = await getOrCreateInventory();
    const usage = await calculateUsage();
    const courseSetupPlan = request.scope === 'COURSE_SETUP'
      ? await getCourseSetupPlan(request.courseId._id || request.courseId)
      : null;

    if (request.type === 'TOKEN') {
      const remainingTokens = inventory.totalTokens - usage.TOKEN;
      if (remainingTokens < request.quantity) {
        return NextResponse.json({ message: 'Nu exista suficiente tokenuri disponibile pentru aprobare.' }, { status: 400 });
      }

      if (request.scope === 'COURSE_SETUP' && courseSetupPlan?.students.length && courseSetupPlan.tokenPerStudent > 0) {
        await Resource.insertMany(
          courseSetupPlan.students.map((student) => ({
            studentId: student._id,
            profId: request.professorId._id,
            courseId: request.courseId._id,
            type: 'TOKEN',
            quantity: courseSetupPlan.tokenPerStudent,
            allocationScope: 'COURSE',
          }))
        );
      } else {
        await Resource.create({
          studentId: request.scope === 'EXTRA_STUDENT' ? request.studentId || null : null,
          profId: request.professorId._id,
          courseId: request.courseId._id,
          type: 'TOKEN',
          quantity: request.quantity,
          allocationScope: request.scope === 'EXTRA_STUDENT' ? 'EXTRA' : 'COURSE',
        });
      }
    }

    if (request.type === 'SUBSCRIPTION') {
      const remainingSubscriptions = inventory.totalSubscriptions - usage.SUBSCRIPTION;
      if (remainingSubscriptions < request.quantity) {
        return NextResponse.json({ message: 'Nu exista suficiente abonamente disponibile pentru aprobare.' }, { status: 400 });
      }

      const credentials = [];
      let usedFallbackCredentials = false;
      const resourceEntries = [];
      const courseSlug = request.courseId.name.toLowerCase().replace(/\s+/g, '-');

      if (request.scope === 'COURSE_SETUP' && courseSetupPlan?.students.length && courseSetupPlan.subscriptionPerStudent > 0) {
        for (const student of courseSetupPlan.students) {
          for (let index = 0; index < courseSetupPlan.subscriptionPerStudent; index += 1) {
            const credential = await createSubscriptionCredentialSet(
              `${courseSlug}-${student._id.toString()}-${index + 1}`,
            );
            credentials.push(credential);
            if (credential.provisionedBy === 'fallback') {
              usedFallbackCredentials = true;
            }

            resourceEntries.push({
              studentId: student._id,
              profId: request.professorId._id,
              courseId: request.courseId._id,
              type: 'SUBSCRIPTION',
              quantity: 1,
              allocationScope: 'COURSE',
              credentials: credential,
            });
          }
        }
      } else {
        for (let index = 0; index < request.quantity; index += 1) {
          const credential = await createSubscriptionCredentialSet(`${courseSlug}-${index + 1}`);
          credentials.push(credential);
          if (credential.provisionedBy === 'fallback') {
            usedFallbackCredentials = true;
          }

          resourceEntries.push({
            studentId: request.scope === 'EXTRA_STUDENT' ? request.studentId || null : null,
            profId: request.professorId._id,
            courseId: request.courseId._id,
            type: 'SUBSCRIPTION',
            quantity: 1,
            allocationScope: request.scope === 'EXTRA_STUDENT' ? 'EXTRA' : 'COURSE',
            credentials: credential,
          });
        }
      }

      if (resourceEntries.length > 0) {
        await Resource.insertMany(resourceEntries);
      }

      await sendSubscriptionCredentialsEmail(
        request.professorId.email,
        `${request.professorId.nume} ${request.professorId.prenume}`,
        request.courseId.name,
        credentials,
      );

      request.status = 'APPROVED';
      request.approvedAt = new Date();
      await request.save();

      await logAuditEvent({
        actorId: session.user.id,
        actorEmail: session.user.email,
        actorRole: session.user.role,
        action: 'ADMIN_APPROVE_RESOURCE_REQUEST',
        targetType: 'ResourceRequest',
        targetId: request._id.toString(),
        targetLabel: request.type,
        details: `Cerere aprobata pentru cursul ${request.courseId.name}.`,
        status: 'SUCCESS',
        metadata: { quantity: request.quantity },
      });

      return NextResponse.json({
        message: usedFallbackCredentials
          ? 'Cererea a fost aprobata. resourceService nu este configurat sau nu a raspuns, asa ca au fost generate credentiale locale temporare.'
          : 'Cererea a fost aprobata.',
        data: await buildResponse(),
      });
    }

    request.status = 'APPROVED';
    request.approvedAt = new Date();
    await request.save();

    await logAuditEvent({
      actorId: session.user.id,
      actorEmail: session.user.email,
      actorRole: session.user.role,
      action: 'ADMIN_APPROVE_RESOURCE_REQUEST',
      targetType: 'ResourceRequest',
      targetId: request._id.toString(),
      targetLabel: request.type,
      details: `Cerere aprobata pentru cursul ${request.courseId.name}.`,
      status: 'SUCCESS',
      metadata: { quantity: request.quantity },
    });

    return NextResponse.json({
      message: 'Cererea a fost aprobata.',
      data: await buildResponse(),
    });
  } catch (error) {
    console.error('Eroare procesare cerere resurse:', error);
    return NextResponse.json(
      { message: error?.message || 'Eroare interna la procesarea cererii.' },
      { status: 500 }
    );
  }
}
