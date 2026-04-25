'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';

export default function AdminRolesPage() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndLoad() {
      const session = await getSession();
      if (!session || session.user.role !== 'admin') {
        router.push('/dashboard');
      } else {
        loadUsers();
      }
    }
    checkAuthAndLoad();
  }, [router]);

  const loadUsers = async () => {
    const res = await fetch('/api/admin/roles');
    if (res.ok) {
        const data = await res.json();
        setUsers(data);
    }
  };

  const handleAction = async (targetUserEmail, action, newRole = '') => {
    const res = await fetch('/api/admin/roles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserEmail, action, newRole }),
    });

    const data = await res.json();
    setMessage(data.message);
    loadUsers();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
      <div className="bg-white rounded shadow-md w-full max-w-4xl p-8 text-black">
        <h1 className="text-3xl font-bold mb-4">Gestionează Rolurile (6p)</h1>
        <a href="/dashboard" className="text-blue-500 hover:underline mb-4 block">Înapoi la Dashboard</a>
        
        {message && <p className="mb-4 text-green-600 font-bold">{message}</p>}
        
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="border-b-2 border-gray-300">
                    <th className="py-2">Email</th>
                    <th>Rol Curent</th>
                    <th>Acțiuni de Administrare (Atribuire, Modificare, Revocare)</th>
                </tr>
            </thead>
            <tbody>
                {users.map(u => (
                    <tr key={u._id} className="border-b py-2">
                        <td className="py-3">{u.email}</td>
                        <td><span className="bg-gray-200 px-2 rounded py-1">{u.role}</span></td>
                        <td className="flex gap-2 py-3">
                            <button onClick={() => handleAction(u.email, 'modify', 'admin')} 
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 flex-1 rounded text-sm">
                                Fă Admin
                            </button>
                            <button onClick={() => handleAction(u.email, 'revoke')} 
                                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 flex-1 rounded text-sm">
                                Revocă (Fă User)
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
