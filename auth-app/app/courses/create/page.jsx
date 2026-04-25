'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';

export default function CreateCoursePage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxStudents, setMaxStudents] = useState(0);
  const [tokenPerStudent, setTokenPerStudent] = useState(0);
  const [subscriptionPerStudent, setSubscriptionPerStudent] = useState(0);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function loadStudents() {
    try {
      const res = await fetch('/api/students');
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (error) {
      console.error('Failed to load students:', error);
    }
  }

  useEffect(() => {
    async function checkAuthAndLoad() {
      const session = await getSession();
      if (!session || (session.user.role !== 'Admin' && session.user.role !== 'Profesor')) {
        router.push('/dashboard');
        return;
      }

      await loadStudents();
    }
    checkAuthAndLoad();
  }, [router]);

  const handleStudentSelect = (studentId) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          students: selectedStudents,
          maxStudents,
          tokenPerStudent,
          subscriptionPerStudent,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Curs creat cu succes! Studenții au fost notificați pe e-mail, iar cererile de resurse au fost trimise către administrator.');
        setName('');
        setDescription('');
        setMaxStudents(0);
        setTokenPerStudent(0);
        setSubscriptionPerStudent(0);
        setSelectedStudents([]);
      } else {
        setMessage(`Eroare: ${data.message}`);
      }
    } catch (error) {
      setMessage('Eroare conexiune. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8 text-black">
      <div className="bg-white rounded shadow-md w-full max-w-3xl p-8">
        <h1 className="text-3xl font-bold mb-4 text-center">Creare Curs Nou</h1>
        <a href="/dashboard" className="text-blue-500 hover:underline mb-6 block text-center">« Înapoi la Dashboard</a>

        {message && (
          <div className={`p-4 mb-4 text-center font-bold rounded ${message.includes('succes') ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2">Numele Cursului</label>
            <input 
              type="text" 
              className="border border-gray-300 p-2 rounded w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2">Descriere sumară</label>
            <textarea 
              className="border border-gray-300 p-2 rounded w-full"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div>
              <label className="block text-gray-700 font-bold mb-2">Număr maxim studenți</label>
              <input
                type="number"
                min="0"
                className="border border-gray-300 p-2 rounded w-full"
                value={maxStudents}
                onChange={(e) => setMaxStudents(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">Tokenuri / student</label>
              <input
                type="number"
                min="0"
                className="border border-gray-300 p-2 rounded w-full"
                value={tokenPerStudent}
                onChange={(e) => setTokenPerStudent(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">Abonamente / student</label>
              <input
                type="number"
                min="0"
                className="border border-gray-300 p-2 rounded w-full"
                value={subscriptionPerStudent}
                onChange={(e) => setSubscriptionPerStudent(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mb-6 rounded border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Total solicitat către administrator: <strong>{(Number(maxStudents) || 0) * (Number(tokenPerStudent) || 0)}</strong> tokenuri și <strong>{(Number(maxStudents) || 0) * (Number(subscriptionPerStudent) || 0)}</strong> abonamente.
            Supliment profesor (10%): <strong>{Math.ceil(((Number(maxStudents) || 0) * (Number(tokenPerStudent) || 0)) * 0.1)}</strong> tokenuri și <strong>{Math.ceil(((Number(maxStudents) || 0) * (Number(subscriptionPerStudent) || 0)) * 0.1)}</strong> abonamente.
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2">Atribuie Studenți (Opțional)</label>
            <p className="text-sm text-gray-500 mb-3">Studenții selectați vor primi notificare prin e-mail.</p>
            
            <div className="border border-gray-200 rounded p-4 max-h-60 overflow-y-auto bg-gray-50">
              {students.length === 0 ? (
                 <p className="text-gray-500 text-sm">Nu există studenți activi pentru a fi atribuiți.</p>
              ) : (
                students.map((student) => (
                  <div key={student._id} className="flex items-center justify-between bg-white p-3 mb-2 rounded border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id={student._id}
                        className="w-5 h-5 cursor-pointer accent-blue-600"
                        checked={selectedStudents.includes(student._id)}
                        onChange={() => handleStudentSelect(student._id)}
                      />
                      <label htmlFor={student._id} className="cursor-pointer select-none font-medium">
                        {student.nume} {student.prenume} <span className="font-normal text-gray-500 text-sm ml-1">({student.email})</span>
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-sm mt-2 font-bold text-blue-600">Total studenți selectați: {selectedStudents.length}</p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Se creează...' : 'Creează Cursul și Atribuie Studenții'}
          </button>
        </form>
      </div>
    </div>
  );
}
