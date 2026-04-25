'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

export default function ResetPasswordConfirmPage({ params }) {
  const router = useRouter();
  // Unwrap params using React.use() as per Next.js 15+ App Router rules
  const { token } = use(params);
  
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/reset-password/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage('Parolă salvată cu succes! Te redirecționez...');
      setTimeout(() => router.push('/login'), 3000);
    } else {
      setMessage(data.message || 'Eroare la procesarea token-ului!');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-black">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-8 bg-white rounded shadow-md max-w-sm w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">Creare Noua Parolă</h2>
        {message && <p className="text-green-600 font-bold bg-green-50 p-2">{message}</p>}
        
        <input type="password" placeholder="Noua Parolă" onChange={(e) => setNewPassword(e.target.value)} required className="border p-2 rounded" />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Salvează noua parolă</button>
      </form>
    </div>
  );
}
