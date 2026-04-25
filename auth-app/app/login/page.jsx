'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await signIn('credentials', { email, password, redirect: false });
    if (result.error) {
      setError("Email sau parolă incorecte!");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-8 bg-white rounded shadow-md max-w-sm w-full text-black">
        <h2 className="text-2xl font-bold mb-4 text-center">Login (15p)</h2>
        {error && <p className="text-red-500">{error}</p>}
        <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} required className="border p-2 rounded" />
        <input type="password" placeholder="Parolă" onChange={(e) => setPassword(e.target.value)} required className="border p-2 rounded" />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Login</button>
        <div className="flex justify-between text-sm mt-4">
          <a href="/register" className="text-blue-500 hover:underline">Înregistrare</a>
          <a href="/reset-password" className="text-blue-500 hover:underline">Resetare parolă</a>
        </div>
      </form>
    </div>
  );
}
