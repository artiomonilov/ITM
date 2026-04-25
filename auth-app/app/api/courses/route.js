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
      return NextResponse.json({ message: 'Nu ai permisiuni pentru a crea cursuri.' }, { status: 403 });
    }

    const { name, description, destination, students, maxStudents, tokenPerStudent, subscriptionPerStudent } = await req.json();

    if (!name || !description) {
      return NextResponse.json({ message: 'Numele si descrierea cursului sunt obligatorii.' }, { status: 400 });
    }

    await connectDB();

    const courseDestination = destination === 'PROFESSOR' ? 'PROFESSOR' : 'STUDENT';
    const assignedStudents = courseDestination === 'STUDENT' ? (students || []) : [];
    const maxStudentsValue = courseDestination === 'STUDENT'
      ? Math.max(Number(maxStudents) || 0, assignedStudents.length)
      : 0;
    const tokenPerStudentValue = courseDestination === 'STUDENT' ? Math.max(0, Number(tokenPerStudent) || 0) : 0;
    const subscriptionPerStudentValue = courseDestination === 'STUDENT' ? Math.max(0, Number(subscriptionPerStudent) || 0) : 0;
    const tokenTotalRequested = maxStudentsValue * tokenPerStudentValue;
    const subscriptionTotalRequested = maxStudentsValue * subscriptionPerStudentValue;
    const tokenExtraAllowance = Math.ceil(tokenTotalRequested * 0.1);
    const subscriptionExtraAllowance = Math.ceil(subscriptionTotalRequested * 0.1);

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

    const resourceRequests = [];
    if (courseDestination === 'STUDENT' && tokenTotalRequested > 0) {
      resourceRequests.push({
        professorId: session.user.id,
        courseId: newCourse._id,
        type: 'TOKEN',
        quantity: tokenTotalRequested,
        scope: 'COURSE_SETUP',
        reason: `Necesar initial pentru curs (${tokenPerStudentValue} tokenuri/student x ${maxStudentsValue} studenti). Supliment profesor: ${tokenExtraAllowance}.`,
      });
    }

    if (courseDestination === 'STUDENT' && subscriptionTotalRequested > 0) {
      resourceRequests.push({
        professorId: session.user.id,
        courseId: newCourse._id,
        type: 'SUBSCRIPTION',
        quantity: subscriptionTotalRequested,
        scope: 'COURSE_SETUP',
        reason: `Necesar initial pentru curs (${subscriptionPerStudentValue} abonamente/student x ${maxStudentsValue} studenti). Supliment profesor: ${subscriptionExtraAllowance}.`,
      });
    }

    if (resourceRequests.length > 0) {
      await ResourceRequest.insertMany(resourceRequests);
    }

    if (courseDestination === 'STUDENT' && assignedStudents.length > 0) {
      const teacherName = `${session.user.nume} ${session.user.prenume}`;
      const assignedStudentsUsers = await User.find({ _id: { $in: assignedStudents } });

      for (const student of assignedStudentsUsers) {
        sendCourseAssignmentEmail(student.email, name, teacherName);
      }
    }

    return NextResponse.json({ message: 'Curs creat cu succes!' }, { status: 201 });
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
