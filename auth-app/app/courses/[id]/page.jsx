import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import Assignment from '@/models/Assignment';
import User from '@/models/User';
import CourseDetailClient from '@/app/components/CourseDetailClient';

export default async function CoursePage({ params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  await connectDB();
  const course = await Course.findById(id)
    .populate('teacher', 'nume prenume')
    .populate('students', 'nume prenume email')
    .lean();

  if (!course) {
    redirect('/dashboard');
  }

  const isTeacher = session.user.role === 'Profesor' && course.teacher?._id.toString() === session.user.id;
  const isAdmin = session.user.role === 'Admin';
  const isStudent = session.user.role === 'Student';
  const enrolled = course.students.some(student => student._id.toString() === session.user.id);

  if (isStudent && !enrolled) {
    redirect('/dashboard');
  }

  const userIds = [
    ...(course.materials || []).map(item => item.uploadedBy?.toString()).filter(Boolean),
  ];

  const uniqueUserIds = [...new Set(userIds)];
  const users = await User.find({ _id: { $in: uniqueUserIds } }).lean();
  const userMap = users.reduce((acc, user) => {
    acc[user._id.toString()] = `${user.nume} ${user.prenume}`;
    return acc;
  }, {});

  // Fetch assignments from Assignment collection
  let assignmentsData = await Assignment.find({ course: id })
    .populate('student', 'nume prenume')
    .lean();

  // Filter based on role
  if (isStudent) {
    assignmentsData = assignmentsData.filter(a => a.student?._id.toString() === session.user.id);
  }

  const assignments = assignmentsData.map(item => ({
    student: item.student?._id.toString(),
    studentName: item.student ? `${item.student.nume} ${item.student.prenume}` : null,
    fileUrl: item.fileUrl,
    fileName: item.fileName,
    submittedAt: item.submittedAt,
    comment: item.comment
  }));

  const detailedCourse = {
    _id: course._id.toString(),
    name: course.name,
    description: course.description,
    teacherName: course.teacher ? `${course.teacher.nume} ${course.teacher.prenume}` : 'N/A',
    studentsCount: course.students.length,
    materials: (course.materials || []).map(item => ({
      title: item.title,
      description: item.description,
      fileUrl: item.fileUrl,
      uploadedAt: item.uploadedAt,
      uploadedByName: item.uploadedBy ? userMap[item.uploadedBy.toString()] || 'Profesor' : 'Profesor'
    })),
    assignments: assignments
  };

  return (
    <div className="min-h-screen bg-gray-100 text-black p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">{detailedCourse.name}</h1>
            <p className="text-gray-600 mt-2">Profesor: {detailedCourse.teacherName}</p>
          </div>
          <Link href="/dashboard" className="text-blue-600 hover:underline font-semibold">
            « Înapoi la dashboard
          </Link>
        </div>

        <div className="bg-white rounded shadow border border-gray-200 p-6">
          <CourseDetailClient
            courseId={detailedCourse._id}
            course={detailedCourse}
            currentUserRole={session.user.role}
            currentUserId={session.user.id}
            isTeacher={isTeacher || isAdmin}
            isEnrolled={enrolled}
          />
        </div>
      </div>
    </div>
  );
}
