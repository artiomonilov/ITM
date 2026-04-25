import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import ResourceRequest from '@/models/ResourceRequest';
import User from '@/models/User';
import { sendCourseAssignmentEmail } from '@/lib/mailer';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'Admin' && session.user.role !== 'Profesor')) {
      return NextResponse.json({ message: "Nu ai permisiuni pentru a crea cursuri." }, { status: 403 });
    }

    const { name, description, students, maxStudents, tokenPerStudent, subscriptionPerStudent } = await req.json();

    if (!name || !description) {
      return NextResponse.json({ message: "Numele și descrierea cursului sunt obligatorii." }, { status: 400 });
    }

    await connectDB();

    const maxStudentsValue = Math.max(Number(maxStudents) || 0, (students || []).length);
    const tokenPerStudentValue = Math.max(0, Number(tokenPerStudent) || 0);
    const subscriptionPerStudentValue = Math.max(0, Number(subscriptionPerStudent) || 0);
    const tokenTotalRequested = maxStudentsValue * tokenPerStudentValue;
    const subscriptionTotalRequested = maxStudentsValue * subscriptionPerStudentValue;
    const tokenExtraAllowance = Math.ceil(tokenTotalRequested * 0.1);
    const subscriptionExtraAllowance = Math.ceil(subscriptionTotalRequested * 0.1);

    const newCourse = await Course.create({
      name,
      description,
      teacher: session.user.id,
      students: students || [],
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

    const resourceRequests = [];
    if (tokenTotalRequested > 0) {
      resourceRequests.push({
        professorId: session.user.id,
        courseId: newCourse._id,
        type: 'TOKEN',
        quantity: tokenTotalRequested,
        scope: 'COURSE_SETUP',
        reason: `Necesar inițial pentru curs (${tokenPerStudentValue} tokenuri/student x ${maxStudentsValue} studenți). Supliment profesor: ${tokenExtraAllowance}.`,
      });
    }

    if (subscriptionTotalRequested > 0) {
      resourceRequests.push({
        professorId: session.user.id,
        courseId: newCourse._id,
        type: 'SUBSCRIPTION',
        quantity: subscriptionTotalRequested,
        scope: 'COURSE_SETUP',
        reason: `Necesar inițial pentru curs (${subscriptionPerStudentValue} abonamente/student x ${maxStudentsValue} studenți). Supliment profesor: ${subscriptionExtraAllowance}.`,
      });
    }

    if (resourceRequests.length > 0) {
      await ResourceRequest.insertMany(resourceRequests);
    }

    // Send emails to assigned students
    if (students && students.length > 0) {
      // Get teacher name
      const teacherName = `${session.user.nume} ${session.user.prenume}`;
      
      const assignedStudents = await User.find({ _id: { $in: students } });
      
      for (const student of assignedStudents) {
         sendCourseAssignmentEmail(student.email, name, teacherName);
      }
    }

    return NextResponse.json({ message: "Curs creat cu succes!" }, { status: 201 });
  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json({ message: "Eroare la crearea cursului." }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Neautorizat" }, { status: 403 });
    }

    await connectDB();

    // Daca este profesor/admin => Vede cursurile lui / toate
    // Daca este student => Vede doar cursurile unde este atribuit
    let filter = {};
    if (session.user.role === 'Student') {
      filter = { students: session.user.id };
    } else if (session.user.role === 'Profesor') {
       filter = { teacher: session.user.id };
    }

    // Vom expanda si referintele de student si teacher ca sa aratam numele nu decat ID-ul
    const courses = await Course.find(filter)
        .populate('teacher', 'nume prenume')
        .populate('students', 'nume prenume email');

    return NextResponse.json(courses, { status: 200 });
  } catch (error) {
    console.error('Eroare oprimare cursuri', error);
    return NextResponse.json({ message: "Eroare la preluarea cursurilor." }, { status: 500 });
  }
}
