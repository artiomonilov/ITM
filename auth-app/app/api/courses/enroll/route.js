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
      return NextResponse.json({ message: "Doar studenții au permisiunea de a se înrola automat." }, { status: 403 });
    }

    const { courseId } = await req.json();
    const safeCourseId = ensureObjectId(courseId, 'ID-ul cursului');

    await connectDB();

    const course = await Course.findById(safeCourseId);
    if (!course) {
      return NextResponse.json({ message: "Cursul nu a fost găsit." }, { status: 404 });
    }

    // Verificăm dacă studentul este deja înrolat
    if (course.students.includes(session.user.id)) {
      return NextResponse.json({ message: "Ești deja înscris la acest curs." }, { status: 400 });
    }

    if (course.maxStudents > 0 && course.students.length >= course.maxStudents) {
      return NextResponse.json({ message: "Cursul a atins numărul maxim de studenți." }, { status: 400 });
    }

    // Adăugăm studentul
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

    return NextResponse.json({ message: "Te-ai înrolat cu succes!" }, { status: 200 });
  } catch (error) {
    console.error("Eroare la înrolare:", error);
    return NextResponse.json({ message: "Eroare la procesarea cererii." }, { status: 500 });
  }
}
