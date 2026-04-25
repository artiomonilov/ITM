import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from 'next/navigation';
import LogoutButton from "@/app/components/LogoutButton";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8 text-black">
      <div className="bg-white rounded shadow-md w-full max-w-2xl p-8">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="mb-2">Autentificat ca: <strong>{session.user.nume} {session.user.prenume} ({session.user.email})</strong></p>
        <p className="mb-8">Rol curent: <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-bold">{session.user.role}</span></p>

        {session.user.role === 'Admin' && (
          <div className="bg-yellow-100 p-4 rounded mb-4 border border-yellow-300">
            <h2 className="text-xl font-bold">Secțiune Administrator (6p)</h2>
            <p className="mb-2">Gestionarea rolurilor și activării (Restricții)</p>
            <a href="/admin/roles" className="text-blue-600 hover:underline font-bold">» Gestionează utilizatorii (atribuire roluri & (dez)activare)</a>
          </div>
        )}
        
        {session.user.role !== 'Admin' && (
          <div className="bg-gray-200 p-4 rounded mb-4 text-black">
            <h2 className="text-xl font-bold">Restricție vizualizare bazată pe Rol</h2>
            <p>Nu aveți drepturi de "Admin" pe acest cont. Zona de administrare este ascunsă.</p>
          </div>
        )}
        
        <LogoutButton />
      </div>
    </div>
  );
}
