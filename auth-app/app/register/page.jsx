'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [form, setForm] = useState({ nume: '', prenume: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setMessage('Cont creat cu succes!');
      setTimeout(() => router.push('/login'), 2000);
    } else {
      const data = await res.json();
      setMessage(data.message || 'Eroare la creare!');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-8 bg-white rounded shadow-md max-w-sm w-full text-black">
        <h2 className="text-2xl font-bold mb-4 text-center">Înregistrare Nouă (3p)</h2>
        {message && <p className="text-green-600 font-bold">{message}</p>}
        <input type="text" placeholder="Nume" onChange={(e) => setForm({...form, nume: e.target.value})} required className="border p-2 rounded" />
        <input type="text" placeholder="Prenume" onChange={(e) => setForm({...form, prenume: e.target.value})} required className="border p-2 rounded" />
        <input type="email" placeholder="Email" onChange={(e) => setForm({...form, email: e.target.value})} required className="border p-2 rounded" />
        <input type="password" placeholder="Parolă" onChange={(e) => setForm({...form, password: e.target.value})} required className="border p-2 rounded" />
        <button type="submit" className="bg-green-500 text-white p-2 rounded hover:bg-green-600">Creare Cont</button>
        <a href="/login" className="text-blue-500 text-sm mt-4 hover:underline text-center">Inapoi la login</a>
      </form>
    </div>
  );
}
