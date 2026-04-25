import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from 'next/navigation';
import LogoutButton from "@/app/components/LogoutButton";
import Link from 'next/link';
import CourseListClient from "@/app/components/CourseListClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Preia cursurile folosind un endpoint intern (trebuie adaugat header pt session sau folosit fetch absolut)
  // Întrucât suntem pe Server Component, putem invoca `Course.find` direct din DB, dar ca o practică bună folosim un API route sau funcții SSR pure.
  // Pentru simplitate, fiind Server Component, cerem cursurile direct din db:
  let coursesInit = [];
  try {
    const { connectDB } = await import('@/lib/mongodb');
    const Course = (await import('@/models/Course')).default;
    await connectDB();

    // Studenții pot vedea acum toată lista de cursuri (sau doar cele alocate, dacă lăsam filter)
    // Conform cerinței, scoatem filtrul restrictiv pentru studenți ca să le poată vedea pe toate
    let filter = {};
    if (session.user.role === 'Profesor') {
      filter = { teacher: session.user.id }; // Profesorii le văd doar pe ale lor, sau poți lăsa gol ca să le vadă pe toate
    }

    const coursesList = await Course.find(filter)
      .populate('teacher', 'nume prenume')
      .populate('students', 'nume prenume')
      .lean();

    coursesInit = coursesList.map(c => ({
      _id: c._id.toString(),
      name: c.name,
      description: c.description,
      teacher: c.teacher ? { nume: c.teacher.nume, prenume: c.teacher.prenume } : null,
      studentsCount: c.students ? c.students.length : 0,
      studentsList: c.students ? c.students.map(s => s._id.toString()) : [],
      createdAt: c.createdAt ? c.createdAt.toISOString() : null,
    }));
  } catch (error) {
    console.error('Failed to load courses on dashboard', error);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8 text-black">
      <div className="bg-white rounded shadow-md w-full max-w-4xl p-8">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="mb-2">Autentificat ca: <strong>{session.user.nume} {session.user.prenume} ({session.user.email})</strong></p>
        <p className="mb-8">Rol curent: <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-bold">{session.user.role}</span></p>

        {session.user.role === 'Admin' && (
          <div className="bg-yellow-100 p-4 rounded mb-4 border border-yellow-300">
            <h2 className="text-xl font-bold mb-2">Secțiune Administrator</h2>
            <Link href="/admin/roles" className="text-blue-600 hover:underline font-bold block mb-1">» Gestionează utilizatorii</Link>
            <Link href="/admin/activities" className="text-blue-600 hover:underline font-bold block mb-1">» Gestionează activități</Link>
            <Link href="/admin/resources" className="text-blue-600 hover:underline font-bold block mb-1">» Gestionează resurse</Link>
            <Link href="/admin/statistics" className="text-blue-600 hover:underline font-bold block mb-1">» Statistici resurse</Link>
            <Link href="/courses/create" className="text-blue-600 hover:underline font-bold block">» Creează Curs Nou (Global)</Link>
          </div>
        )}

        {session.user.role === 'Profesor' && (
          <div className="bg-blue-50 p-4 rounded mb-4 border border-blue-200 text-black">
            <h2 className="text-xl font-bold mb-2">Acțiuni Profesor</h2>
            <Link href="/courses/create" className="text-blue-600 hover:underline font-bold bg-blue-100 px-3 py-2 rounded inline-block">➕ Creează Curs Nou</Link>
          </div>
        )}
        
        {session.user.role !== 'Admin' && session.user.role !== 'Profesor' && session.user.role !== 'Student' && (
          <div className="bg-gray-200 p-4 rounded mb-4 text-black">
            <h2 className="text-xl font-bold">Informație</h2>
            <p>Zona ta de activitate nu deține acțiuni speciale.</p>
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
