'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';

export default function AdminRolesPage() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  
  // Starea locală pt Nume/Prenume pentru fiecare user ca să putem face editare individuală
  const [editDetails, setEditDetails] = useState({});
  
  const router = useRouter();
  const validRoles = ['Student', 'Profesor', 'Admin', 'Audit'];

  async function loadUsers() {
    const res = await fetch('/api/admin/roles');
    if (res.ok) {
        const data = await res.json();
        setUsers(data);
        
        let initialEdits = {};
        data.forEach(u => {
          initialEdits[u.email] = { nume: u.nume, prenume: u.prenume };
        });
        setEditDetails(initialEdits);
    }
  }

  useEffect(() => {
    async function checkAuthAndLoad() {
      const session = await getSession();
      if (!session || session.user.role !== 'Admin') {
        router.push('/dashboard');
      } else {
        loadUsers();
      }
    }
    checkAuthAndLoad();
  }, [router]);

  const handleRoleChange = async (targetUserEmail, newRole) => {
    const res = await fetch('/api/admin/roles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserEmail, action: 'modifyRole', newRole }),
    });
    const data = await res.json();
    setMessage(data.message);
    loadUsers();
  };

  const handleStatusToggle = async (targetUserEmail, currentStatus) => {
    const res = await fetch('/api/admin/roles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserEmail, action: 'toggleStatus', toggleStatus: !currentStatus }),
    });
    const data = await res.json();
    setMessage(data.message);
    loadUsers();
  };
  
  const handleSaveDetails = async (targetUserEmail) => {
    const newNume = editDetails[targetUserEmail].nume;
    const newPrenume = editDetails[targetUserEmail].prenume;
    
    const res = await fetch('/api/admin/roles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserEmail, action: 'updateDetails', newNume, newPrenume }),
    });
    const data = await res.json();
    setMessage(data.message);
    loadUsers(); // Reîncarcă DB după salvare
  };

  const handleInputChange = (email, field, value) => {
    setEditDetails({
      ...editDetails,
      [email]: {
        ...editDetails[email],
        [field]: value
      }
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8 text-black">
      <div className="bg-white rounded shadow-md w-full max-w-6xl p-8">
        <h1 className="text-3xl font-bold mb-4">Panou de Administrare</h1>
        <div className="mb-4 flex gap-4 text-sm font-semibold">
          <a href="/dashboard" className="text-blue-500 hover:underline">Înapoi la Dashboard</a>
          <a href="/admin/activities" className="text-blue-500 hover:underline">Gestionează activități</a>
          <a href="/admin/resources" className="text-blue-500 hover:underline">Gestionează resurse</a>
        </div>
        
        {message && <p className="mb-4 text-green-600 font-bold bg-green-50 p-2 border border-green-200">{message}</p>}
        
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="border-b-2 border-gray-300">
                    <th className="py-2">Email</th>
                    <th>Nume & Prenume</th>
                    <th>Acțiune Nume</th>
                    <th>Rol (Enum)</th>
                    <th>Stare / Activare</th>
                </tr>
            </thead>
            <tbody>
                {users.map(u => (
                    <tr key={u._id} className="border-b py-2">
                        <td className="py-3 text-sm">{u.email}</td>
                        <td className="py-3 pr-2">
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={editDetails[u.email]?.nume || ''} 
                              onChange={(e) => handleInputChange(u.email, 'nume', e.target.value)}
                              className="border p-1 w-24 rounded text-sm"
                              placeholder="Nume"
                            />
                            <input 
                              type="text" 
                              value={editDetails[u.email]?.prenume || ''} 
                              onChange={(e) => handleInputChange(u.email, 'prenume', e.target.value)}
                              className="border p-1 w-24 rounded text-sm"
                              placeholder="Prenume"
                            />
                          </div>
                        </td>
                        <td className="py-3">
                           {/* Daca s-a modificat, butonul salveaza detalii.*/}
                           {editDetails[u.email] && (editDetails[u.email].nume !== u.nume || editDetails[u.email].prenume !== u.prenume) ? (
                              <button onClick={() => handleSaveDetails(u.email)} className="bg-blue-500 text-white px-2 py-1 rounded text-xs">Salvează</button>
                           ) : ( <span className="text-xs text-gray-500">Salvat</span> )}
                        </td>
                        <td className="py-3">
                            <select 
                                value={u.role} 
                                onChange={(e) => handleRoleChange(u.email, e.target.value)}
                                className="border border-gray-300 p-1 rounded text-sm cursor-pointer"
                            >
                                {validRoles.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </td>
                        <td className="py-3">
                            <button 
                                onClick={() => handleStatusToggle(u.email, u.isActive)}
                                className={`px-3 py-1 rounded text-white text-xs font-bold ${u.isActive ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}`}
                            >
                                {u.isActive ? 'Suspendă cont' : 'Activează'}
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
