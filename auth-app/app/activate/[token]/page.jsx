'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

export default function ActivateAccountPage({ params }) {
  const router = useRouter();
  const { token } = use(params);
  
  const [message, setMessage] = useState('Se activează contul tău... Te rugăm să aștepți.');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      activateAccount();
    }
  }, [token]);

  const activateAccount = async () => {
    try {
      const res = await fetch(`/api/activate/confirm`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(true);
        setMessage("Cont activat cu succes! Te redirecționăm la login...");
        setTimeout(() => router.push('/login'), 4000);
      } else {
        setMessage(data.message || "Eroare la activare. Token invalid sau expirat.");
      }
    } catch (error) {
      setMessage("A apărut o eroare la server.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-black">
      <div className="bg-white rounded shadow-md max-w-sm w-full p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Activare Cont</h2>
        <div className={`p-4 rounded border font-bold ${success ? 'bg-green-100 border-green-300 text-green-700' : 'bg-blue-100 border-blue-300 text-blue-700'}`}>
          {message}
        </div>
        {!success && (
            <a href="/login" className="text-blue-500 text-sm mt-6 block hover:underline">
               Du-mă la login manual
            </a>
        )}
      </div>
    </div>
  );
}
