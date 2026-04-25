'use client';
import { useState } from 'react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setMessage(data.message);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-black">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-8 bg-white rounded shadow-md max-w-sm w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">Resetare parolă (Mailing)</h2>
        {message && <p className="text-blue-600 font-bold bg-blue-50 p-2">{message}</p>}
        <input type="email" placeholder="Introdu email-ul tău" onChange={(e) => setEmail(e.target.value)} required className="border p-2 rounded" />
        <button type="submit" className="bg-orange-500 text-white p-2 rounded hover:bg-orange-600">Trimite Link Resetare</button>
        <a href="/login" className="text-blue-500 text-sm mt-4 hover:underline text-center">Inapoi la login</a>
      </form>
    </div>
  );
}
