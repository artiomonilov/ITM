import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import LogoutButton from '@/app/components/LogoutButton';
import Link from 'next/link';
import CourseListClient from '@/app/components/CourseListClient';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  let coursesInit = [];
  try {
    const { connectDB } = await import('@/lib/mongodb');
    const Course = (await import('@/models/Course')).default;
    await connectDB();

    const studentDestinationFilter = {
      $or: [
        { destination: 'STUDENT' },
        { destination: { $exists: false } },
        { destination: null },
      ],
    };

    let filter = studentDestinationFilter;

    const coursesList = await Course.find(filter)
      .populate('teacher', 'nume prenume')
      .populate('students', 'nume prenume')
      .lean();

    coursesInit = coursesList.map((course) => ({
      _id: course._id.toString(),
      name: course.name,
      description: course.description,
      destination: course.destination || 'STUDENT',
      teacher: course.teacher ? { nume: course.teacher.nume, prenume: course.teacher.prenume } : null,
      studentsCount: course.students ? course.students.length : 0,
      studentsList: course.students ? course.students.map((student) => student._id.toString()) : [],
      maxStudents: course.maxStudents || 0,
      createdAt: course.createdAt ? course.createdAt.toISOString() : null,
    }));
  } catch (error) {
    console.error('Failed to load courses on dashboard', error);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-8 text-black">
      <div className="w-full max-w-4xl rounded bg-white p-8 shadow-md">
        <h1 className="mb-4 text-3xl font-bold">Dashboard</h1>
        <p className="mb-2">
          Autentificat ca: <strong>{session.user.nume} {session.user.prenume} ({session.user.email})</strong>
        </p>
        <p className="mb-8">
          Rol curent: <span className="rounded bg-blue-100 px-2 py-1 font-bold text-blue-800">{session.user.role}</span>
        </p>

        {session.user.role === 'Admin' && (
          <div className="mb-4 rounded border border-yellow-300 bg-yellow-100 p-4">
            <h2 className="mb-2 text-xl font-bold">Sectiune Administrator</h2>
            <Link href="/admin/roles" className="mb-1 block font-bold text-blue-600 hover:underline">» Gestioneaza utilizatorii</Link>
            <Link href="/admin/activities" className="mb-1 block font-bold text-blue-600 hover:underline">» Gestioneaza activitati</Link>
            <Link href="/admin/resources" className="mb-1 block font-bold text-blue-600 hover:underline">» Gestioneaza resurse</Link>
            <Link href="/admin/statistics" className="mb-1 block font-bold text-blue-600 hover:underline">» Statistici resurse</Link>
            <Link href="/audit/logs" className="mb-1 block font-bold text-blue-600 hover:underline">» Audit logs</Link>
            <Link href="/courses/create" className="block font-bold text-blue-600 hover:underline">» Creeaza Curs Nou</Link>
          </div>
        )}

        {session.user.role === 'Profesor' && (
          <div className="mb-4 rounded border border-blue-300 bg-blue-50 p-4">
            <h2 className="mb-2 text-xl font-bold">Sectiune Profesor</h2>
            <Link href="/courses/create" className="inline-block rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700">
              + Creeaza Curs Nou
            </Link>
          </div>
        )}

        {session.user.role === 'Audit' && (
          <div className="mb-4 rounded border border-slate-300 bg-slate-50 p-4">
            <h2 className="mb-2 text-xl font-bold">Sectiune Audit</h2>
            <Link href="/audit/logs" className="block font-bold text-blue-600 hover:underline">» Audit logs</Link>
          </div>
        )}

        {session.user.role !== 'Admin' && session.user.role !== 'Profesor' && session.user.role !== 'Student' && session.user.role !== 'Audit' && (
          <div className="mb-4 rounded bg-gray-200 p-4 text-black">
            <h2 className="text-xl font-bold">Informatie</h2>
            <p>Zona ta de activitate nu detine actiuni speciale.</p>
          </div>
        )}

        {session.user.role === 'Student' && (
          <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Vezi toate cursurile disponibile pentru studenti, apoi foloseste filtrul din lista pentru a afisa doar cursurile la care esti deja inrolat.
          </div>
        )}

        <CourseListClient
          courses={coursesInit}
          currentUserRole={session.user.role}
          currentUserId={session.user.id}
        />

        <LogoutButton />
      </div>
    </div>
  );
}
