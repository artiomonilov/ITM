import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { logAuditEvent } from '@/lib/audit';
import { ensureObjectId } from '@/lib/inputSecurity';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'Student') {
      return NextResponse.json({ message: 'Doar studentii au permisiunea de a se inrola automat.' }, { status: 403 });
    }

    const { courseId } = await req.json();
    const safeCourseId = ensureObjectId(courseId, 'ID-ul cursului');

    await connectDB();

    const course = await Course.findById(safeCourseId);
    if (!course) {
      return NextResponse.json({ message: 'Cursul nu a fost gasit.' }, { status: 404 });
    }

    if ((course.destination || 'STUDENT') !== 'STUDENT') {
      return NextResponse.json({ message: 'Acest curs nu permite inscrierea studentilor.' }, { status: 400 });
    }

    const isAlreadyEnrolled = course.students.some((studentId) => studentId.toString() === session.user.id);
    if (isAlreadyEnrolled) {
      return NextResponse.json({ message: 'Esti deja inscris la acest curs.' }, { status: 400 });
    }

    if (course.maxStudents > 0 && course.students.length >= course.maxStudents) {
      return NextResponse.json({ message: 'Cursul a atins numarul maxim de studenti.' }, { status: 400 });
    }

    course.students.push(session.user.id);
    await course.save();

    await logAuditEvent({
      actorId: session.user.id,
      actorEmail: session.user.email,
      actorRole: session.user.role,
      action: 'ENROLL_COURSE',
      targetType: 'Course',
      targetId: course._id.toString(),
      targetLabel: course.name,
      details: 'Studentul s-a inrolat la curs.',
      status: 'SUCCESS',
    });

    return NextResponse.json({ message: 'Te-ai inrolat cu succes!' }, { status: 200 });
  } catch (error) {
    console.error('Eroare la inrolare:', error);
    return NextResponse.json({ message: error?.message || 'Eroare la procesarea cererii.' }, { status: error?.message ? 400 : 500 });
  }
}
