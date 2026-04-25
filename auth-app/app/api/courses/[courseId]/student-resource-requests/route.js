import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import StudentResourceRequest from '@/models/StudentResourceRequest';
import ResourceRequest from '@/models/ResourceRequest';

async function getCourseContext(courseId, user) {
  const course = await Course.findById(courseId)
    .populate('teacher', 'nume prenume email')
    .populate('students', 'nume prenume email')
    .lean();

  if (!course) {
    return { error: NextResponse.json({ message: 'Cursul nu a fost gasit.' }, { status: 404 }) };
  }

  const isTeacher = user.role === 'Profesor' && course.teacher?._id.toString() === user.id;
  const isAdmin = user.role === 'Admin';
  const isStudent = user.role === 'Student';
  const enrolled = course.students.some((student) => student._id.toString() === user.id);

  if (isStudent && !enrolled) {
    return { error: NextResponse.json({ message: 'Nu esti inscris la acest curs.' }, { status: 403 }) };
  }

  return { course, isTeacher, isAdmin, isStudent, enrolled };
}

function formatRequests(items) {
  return items.map((item) => ({
    _id: item._id.toString(),
    type: item.type,
    quantity: item.quantity,
    reason: item.reason,
    status: item.status,
    adminRequestId: item.adminRequestId ? item.adminRequestId.toString() : null,
    forwardedAt: item.forwardedAt,
    rejectedAt: item.rejectedAt,
    createdAt: item.createdAt,
    student: item.studentId ? {
      _id: item.studentId._id.toString(),
      nume: item.studentId.nume,
      prenume: item.studentId.prenume,
      email: item.studentId.email,
    } : null,
  }));
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Neautorizat.' }, { status: 401 });
  }

  await connectDB();
  const { courseId } = await params;
  const context = await getCourseContext(courseId, session.user);
  if (context.error) {
    return context.error;
  }

  if (!context.isStudent) {
    return NextResponse.json({ message: 'Doar studentii pot crea cereri suplimentare.' }, { status: 403 });
  }

  const { type, quantity, reason } = await req.json();
  if (!['TOKEN', 'SUBSCRIPTION'].includes(type)) {
    return NextResponse.json({ message: 'Tip de resursa invalid.' }, { status: 400 });
  }

  const request = await StudentResourceRequest.create({
    courseId,
    professorId: context.course.teacher._id,
    studentId: session.user.id,
    type,
    quantity: Math.max(1, Number(quantity) || 0),
    reason: reason || '',
  });

  const ownRequests = await StudentResourceRequest.find({
    courseId,
    studentId: session.user.id,
  }).sort({ createdAt: -1 }).populate('studentId', 'nume prenume email').lean();

  return NextResponse.json({
    message: 'Cererea a fost trimisa profesorului.',
    requestId: request._id.toString(),
    studentRequests: formatRequests(ownRequests),
  }, { status: 201 });
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Neautorizat.' }, { status: 401 });
  }

  await connectDB();
  const { courseId } = await params;
  const context = await getCourseContext(courseId, session.user);
  if (context.error) {
    return context.error;
  }

  if (!context.isTeacher && !context.isAdmin) {
    return NextResponse.json({ message: 'Doar profesorul sau adminul pot procesa cereri.' }, { status: 403 });
  }

  const { requestId, decision } = await req.json();
  const request = await StudentResourceRequest.findById(requestId).populate('studentId', 'nume prenume email');
  if (!request) {
    return NextResponse.json({ message: 'Cererea studentului nu a fost gasita.' }, { status: 404 });
  }

  if (request.courseId.toString() !== courseId) {
    return NextResponse.json({ message: 'Cererea nu apartine acestui curs.' }, { status: 400 });
  }

  if (request.status !== 'PENDING_PROFESSOR') {
    return NextResponse.json({ message: 'Cererea a fost deja procesata.' }, { status: 400 });
  }

  if (decision === 'REJECT') {
    request.status = 'REJECTED_BY_PROFESSOR';
    request.rejectedAt = new Date();
    await request.save();
  } else if (decision === 'FORWARD_TO_ADMIN') {
    const adminRequest = await ResourceRequest.create({
      professorId: request.professorId,
      studentId: request.studentId._id,
      courseId: request.courseId,
      type: request.type,
      quantity: request.quantity,
      scope: 'EXTRA_STUDENT',
      reason: request.reason || `Cerere suplimentara pentru studentul ${request.studentId.nume} ${request.studentId.prenume}.`,
    });

    request.status = 'FORWARDED_TO_ADMIN';
    request.adminRequestId = adminRequest._id;
    request.forwardedAt = new Date();
    await request.save();
  } else {
    return NextResponse.json({ message: 'Decizie invalida.' }, { status: 400 });
  }

  const requests = await StudentResourceRequest.find({ courseId })
    .sort({ createdAt: -1 })
    .populate('studentId', 'nume prenume email')
    .lean();

  return NextResponse.json({
    message: decision === 'FORWARD_TO_ADMIN'
      ? 'Cererea a fost trimisa mai departe catre admin.'
      : 'Cererea a fost respinsa.',
    professorRequests: formatRequests(requests),
  });
}
