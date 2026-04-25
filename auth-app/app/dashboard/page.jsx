import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
      <div className="bg-white rounded shadow-md w-full max-w-2xl p-8 text-black">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="mb-2">Autentificat ca: <strong>{session.user.email}</strong></p>
        <p className="mb-8">Rol curent: <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">{session.user.role}</span></p>

        {session.user.role === 'admin' && (
          <div className="bg-yellow-100 p-4 rounded mb-4 border border-yellow-300">
            <h2 className="text-xl font-bold">Secțiune Administrator (6p)</h2>
            <p className="mb-2">Gestionarea rolurilor (restricții de vizualizare)</p>
            <a href="/admin/roles" className="text-blue-600 hover:underline font-bold">» Gestionează utilizatorii (atribuire, modificare, revocare roluri)</a>
          </div>
        )}
        
        {session.user.role !== 'admin' && (
          <div className="bg-gray-200 p-4 rounded mb-4">
            <h2 className="text-xl font-bold text-gray-700">Restricție vizualizare</h2>
            <p>Nu aveți drepturi de administrator. Zona de administrare este ascunsă/interzisă.</p>
          </div>
        )}
      </div>
    </div>
  );
}
