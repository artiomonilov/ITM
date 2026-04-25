'use client';
import { useState } from 'react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword }),
    });

    const data = await res.json();
    setMessage(data.message);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-8 bg-white rounded shadow-md max-w-sm w-full text-black">
        <h2 className="text-2xl font-bold mb-4 text-center">Resetare parolă (2p)</h2>
        {message && <p className="text-blue-600 font-bold">{message}</p>}
        <input type="email" placeholder="Email contului" onChange={(e) => setEmail(e.target.value)} required className="border p-2 rounded" />
        <input type="password" placeholder="Noua Parolă" onChange={(e) => setNewPassword(e.target.value)} required className="border p-2 rounded" />
        <button type="submit" className="bg-orange-500 text-white p-2 rounded hover:bg-orange-600">Salvează noua parolă</button>
        <a href="/login" className="text-blue-500 text-sm mt-4 hover:underline text-center">Inapoi la login</a>
      </form>
    </div>
  );
}
