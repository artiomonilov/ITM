import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import Resource from '@/models/Resource';
import ResourceInventory from '@/models/ResourceInventory';
import User from '@/models/User';
import { sendCourseAssignmentEmail, sendSubscriptionCredentialsEmail } from '@/lib/mailer';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { logAuditEvent } from '@/lib/audit';
import { createSubscriptionCredentialSet } from '@/lib/resourceService';

async function calculateAllocatedResources() {
  const allocations = await Resource.aggregate([
    {
      $group: {
        _id: '$type',
        total: { $sum: '$quantity' },
      },
    },
  ]);

  return allocations.reduce((summary, entry) => ({
    ...summary,
    [entry._id]: entry.total,
  }), { TOKEN: 0, SUBSCRIPTION: 0 });
}

function normalizeStudentIds(students) {
  if (!Array.isArray(students)) {
    return [];
  }

  return [...new Set(
    students
      .map((studentId) => studentId?.toString().trim())
      .filter(Boolean),
  )];
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'Admin' && session.user.role !== 'Profesor')) {
      return NextResponse.json({ message: 'Nu ai permisiuni pentru a crea cursuri.' }, { status: 403 });
    }

    const { name, description, destination, students, maxStudents, tokenPerStudent, subscriptionPerStudent } = await req.json();

    if (!name || !description) {
      return NextResponse.json({ message: 'Numele si descrierea cursului sunt obligatorii.' }, { status: 400 });
    }

    await connectDB();

    const courseDestination = destination === 'PROFESSOR' ? 'PROFESSOR' : 'STUDENT';
    const requestedStudentIds = courseDestination === 'STUDENT' ? normalizeStudentIds(students) : [];
    let assignedStudentsUsers = [];

    if (courseDestination === 'STUDENT' && requestedStudentIds.length > 0) {
      assignedStudentsUsers = await User.find({
        _id: { $in: requestedStudentIds },
        role: 'Student',
      }).select('nume prenume email role');

      if (assignedStudentsUsers.length !== requestedStudentIds.length) {
        return NextResponse.json({
          message: 'Unii utilizatori selectati nu mai exista sau nu au rol de student.',
        }, { status: 400 });
      }
    }

    const assignedStudents = assignedStudentsUsers.map((student) => student._id);
    const assignedStudentsCount = assignedStudents.length;
    const maxStudentsValue = courseDestination === 'STUDENT'
      ? Math.max(Number(maxStudents) || 0, assignedStudentsCount)
      : 0;
    const tokenPerStudentValue = courseDestination === 'STUDENT' ? Math.max(0, Number(tokenPerStudent) || 0) : 0;
    const subscriptionPerStudentValue = courseDestination === 'STUDENT' ? Math.max(0, Number(subscriptionPerStudent) || 0) : 0;
    const tokenTotalRequested = assignedStudentsCount * tokenPerStudentValue;
    const subscriptionTotalRequested = assignedStudentsCount * subscriptionPerStudentValue;
    const tokenExtraAllowance = Math.ceil(tokenTotalRequested * 0.1);
    const subscriptionExtraAllowance = Math.ceil(subscriptionTotalRequested * 0.1);

    if (courseDestination === 'STUDENT' && assignedStudentsCount > 0) {
      const [inventory, allocatedResources] = await Promise.all([
        ResourceInventory.findOne(),
        calculateAllocatedResources(),
      ]);

      const totalTokensInventory = inventory?.totalTokens || 0;
      const totalSubscriptionsInventory = inventory?.totalSubscriptions || 0;
      const remainingTokens = totalTokensInventory - allocatedResources.TOKEN;
      const remainingSubscriptions = totalSubscriptionsInventory - allocatedResources.SUBSCRIPTION;

      if (remainingTokens < tokenTotalRequested) {
        return NextResponse.json({
          message: `Nu exista suficiente tokenuri disponibile. Necesare: ${tokenTotalRequested}, disponibile: ${Math.max(0, remainingTokens)}.`,
        }, { status: 400 });
      }

      if (remainingSubscriptions < subscriptionTotalRequested) {
        return NextResponse.json({
          message: `Nu exista suficiente abonamente disponibile. Necesare: ${subscriptionTotalRequested}, disponibile: ${Math.max(0, remainingSubscriptions)}.`,
        }, { status: 400 });
      }
    }

    const newCourse = await Course.create({
      name,
      description,
      destination: courseDestination,
      teacher: session.user.id,
      students: assignedStudents,
      maxStudents: maxStudentsValue,
      resourceRequirements: {
        tokenPerStudent: tokenPerStudentValue,
        subscriptionPerStudent: subscriptionPerStudentValue,
        tokenTotalRequested,
        subscriptionTotalRequested,
        tokenExtraAllowance,
        subscriptionExtraAllowance,
      },
    });

    if (courseDestination === 'STUDENT' && assignedStudents.length > 0) {
      const teacherName = `${session.user.nume} ${session.user.prenume}`;
      const resourceEntries = [];
      const subscriptionCredentials = [];
      const courseSlug = newCourse.name.toLowerCase().replace(/\s+/g, '-');

      if (tokenPerStudentValue > 0) {
        resourceEntries.push(
          ...assignedStudents.map((studentId) => ({
            studentId,
            profId: session.user.id,
            courseId: newCourse._id,
            type: 'TOKEN',
            quantity: tokenPerStudentValue,
            allocationScope: 'COURSE',
          }))
        );
      }

      if (subscriptionPerStudentValue > 0) {
        for (const student of assignedStudentsUsers) {
          for (let index = 0; index < subscriptionPerStudentValue; index += 1) {
            const credential = await createSubscriptionCredentialSet(
              `${courseSlug}-${student._id.toString()}-${index + 1}`,
            );

            subscriptionCredentials.push({
              studentName: `${student.nume} ${student.prenume}`,
              ...credential,
            });

            resourceEntries.push({
              studentId: student._id,
              profId: session.user.id,
              courseId: newCourse._id,
              type: 'SUBSCRIPTION',
              quantity: 1,
              allocationScope: 'COURSE',
              credentials: credential,
            });
          }
        }
      }

      if (resourceEntries.length > 0) {
        await Resource.insertMany(resourceEntries);
      }

      await Promise.allSettled(
        assignedStudentsUsers.map((student) => sendCourseAssignmentEmail(student.email, name, teacherName))
      );

      if (subscriptionCredentials.length > 0) {
        await sendSubscriptionCredentialsEmail(
          session.user.email,
          teacherName,
          newCourse.name,
          subscriptionCredentials.map(({ studentName, ...credential }) => ({
            ...credential,
            username: `${credential.username} (${studentName})`,
          })),
        );
      }
    }

    await logAuditEvent({
      actorId: session.user.id,
      actorEmail: session.user.email,
      actorRole: session.user.role,
      action: 'CREATE_COURSE',
      targetType: 'Course',
      targetId: newCourse._id.toString(),
      targetLabel: newCourse.name,
      details: 'Curs creat cu alocare directa de resurse pentru studentii atribuiti.',
      status: 'SUCCESS',
      metadata: {
        maxStudents: maxStudentsValue,
        tokenTotalRequested,
        subscriptionTotalRequested,
      },
    });

    return NextResponse.json({
      message: 'Curs creat cu succes!',
      courseId: newCourse._id.toString(),
      allocationSummary: {
        assignedStudentsCount,
        tokenPerStudent: tokenPerStudentValue,
        subscriptionPerStudent: subscriptionPerStudentValue,
        totalAllocatedTokens: tokenTotalRequested,
        totalAllocatedSubscriptions: subscriptionTotalRequested,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json({ message: 'Eroare la crearea cursului.' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Neautorizat' }, { status: 403 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const destination = searchParams.get('destination');
    const scope = searchParams.get('scope');

    let filter = {};
    if (session.user.role === 'Student') {
      filter = { students: session.user.id, destination: 'STUDENT' };
    } else if (session.user.role === 'Profesor') {
      if (scope === 'all' && destination === 'PROFESSOR') {
        filter = { destination: 'PROFESSOR' };
      } else {
        filter = { teacher: session.user.id };
      }
    }

    if (destination === 'STUDENT') {
      filter = { ...filter, destination: 'STUDENT' };
    } else if (destination === 'PROFESSOR') {
      filter = { ...filter, destination: 'PROFESSOR' };
    }

    const courses = await Course.find(filter)
      .populate('teacher', 'nume prenume')
      .populate('students', 'nume prenume email');

    return NextResponse.json(courses, { status: 200 });
  } catch (error) {
    console.error('Eroare preluare cursuri', error);
    return NextResponse.json({ message: 'Eroare la preluarea cursurilor.' }, { status: 500 });
  }
}
