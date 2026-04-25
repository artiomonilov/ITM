'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';
import CourseListClient from '@/app/components/CourseListClient';

export default function CreateCoursePage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState('STUDENT');
  const [maxStudents, setMaxStudents] = useState(0);
  const [tokenPerStudent, setTokenPerStudent] = useState(0);
  const [subscriptionPerStudent, setSubscriptionPerStudent] = useState(0);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [professorCourses, setProfessorCourses] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');
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

  async function loadProfessorCourses() {
    try {
      const res = await fetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        setProfessorCourses(data.filter((course) => (course.destination || 'STUDENT') === 'PROFESSOR'));
      }
    } catch (error) {
      console.error('Failed to load professor courses:', error);
    }
  }

  useEffect(() => {
    async function checkAuthAndLoad() {
      const session = await getSession();
      if (!session || (session.user.role !== 'Admin' && session.user.role !== 'Profesor')) {
        router.push('/dashboard');
        return;
      }

      setCurrentUserId(session.user.id);
      setCurrentUserRole(session.user.role);

      await Promise.all([loadStudents(), loadProfessorCourses()]);
    }

    checkAuthAndLoad();
  }, [router]);

  const handleStudentSelect = (studentId) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter((id) => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  const handleDestinationChange = (value) => {
    setDestination(value);
    if (value === 'PROFESSOR') {
      setSelectedStudents([]);
      setMaxStudents(0);
      setTokenPerStudent(0);
      setSubscriptionPerStudent(0);
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
          destination,
          students: destination === 'STUDENT' ? selectedStudents : [],
          maxStudents: destination === 'STUDENT' ? maxStudents : 0,
          tokenPerStudent: destination === 'STUDENT' ? tokenPerStudent : 0,
          subscriptionPerStudent: destination === 'STUDENT' ? subscriptionPerStudent : 0,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(
          destination === 'STUDENT'
            ? 'Curs creat cu succes! Studentii au fost notificati pe e-mail, iar cererile de resurse au fost trimise catre administrator.'
            : 'Curs pentru profesori creat cu succes.'
        );
        setName('');
        setDescription('');
        setDestination('STUDENT');
        setMaxStudents(0);
        setTokenPerStudent(0);
        setSubscriptionPerStudent(0);
        setSelectedStudents([]);
        await loadProfessorCourses();
      } else {
        setMessage(`Eroare: ${data.message}`);
      }
    } catch (error) {
      setMessage('Eroare conexiune. Incearca din nou.');
    } finally {
      setLoading(false);
    }
  };

  const totalTokens = (Number(maxStudents) || 0) * (Number(tokenPerStudent) || 0);
  const totalSubscriptions = (Number(maxStudents) || 0) * (Number(subscriptionPerStudent) || 0);
  const professorCoursesForList = professorCourses.map((course) => ({
    _id: course._id,
    name: course.name,
    description: course.description,
    destination: course.destination || 'PROFESSOR',
    teacher: course.teacher
      ? { nume: course.teacher.nume, prenume: course.teacher.prenume }
      : null,
    studentsCount: course.students?.length || 0,
    studentsList: course.students?.map((student) => typeof student === 'string' ? student : student._id) || [],
    createdAt: course.createdAt || null,
  }));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-8 text-black">
      <div className="w-full max-w-4xl rounded bg-white p-8 shadow-md">
        <h1 className="mb-4 text-center text-3xl font-bold">Creare Curs Nou</h1>
        <a href="/dashboard" className="mb-6 block text-center text-blue-500 hover:underline">« Inapoi la Dashboard</a>

        {message && (
          <div className={`mb-4 rounded p-4 text-center font-bold ${message.includes('succes') ? 'border border-green-300 bg-green-100 text-green-800' : 'border border-red-300 bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-2 block font-bold text-gray-700">Numele Cursului</label>
            <input
              type="text"
              className="w-full rounded border border-gray-300 p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block font-bold text-gray-700">Destinatie</label>
            <select
              className="w-full rounded border border-gray-300 p-2"
              value={destination}
              onChange={(e) => handleDestinationChange(e.target.value)}
            >
              <option value="STUDENT">Studenti</option>
              <option value="PROFESSOR">Profesori</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="mb-2 block font-bold text-gray-700">Descriere sumara</label>
            <textarea
              className="w-full rounded border border-gray-300 p-2"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {destination === 'STUDENT' && (
            <>
              <div className="mb-6 grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block font-bold text-gray-700">Numar maxim studenti</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded border border-gray-300 p-2"
                    value={maxStudents}
                    onChange={(e) => setMaxStudents(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block font-bold text-gray-700">Tokenuri / student</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded border border-gray-300 p-2"
                    value={tokenPerStudent}
                    onChange={(e) => setTokenPerStudent(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block font-bold text-gray-700">Abonamente / student</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded border border-gray-300 p-2"
                    value={subscriptionPerStudent}
                    onChange={(e) => setSubscriptionPerStudent(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-6 rounded border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                Total solicitat catre administrator: <strong>{totalTokens}</strong> tokenuri si <strong>{totalSubscriptions}</strong> abonamente.
                Supliment profesor (10%): <strong>{Math.ceil(totalTokens * 0.1)}</strong> tokenuri si <strong>{Math.ceil(totalSubscriptions * 0.1)}</strong> abonamente.
              </div>

              <div className="mb-6">
                <label className="mb-2 block font-bold text-gray-700">Atribuie Studenti (Optional)</label>
                <p className="mb-3 text-sm text-gray-500">Studentii selectati vor primi notificare prin e-mail.</p>

                <div className="max-h-60 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-4">
                  {students.length === 0 ? (
                    <p className="text-sm text-gray-500">Nu exista studenti activi pentru a fi atribuiti.</p>
                  ) : (
                    students.map((student) => (
                      <div key={student._id} className="mb-2 flex items-center justify-between rounded border border-gray-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={student._id}
                            className="h-5 w-5 cursor-pointer accent-blue-600"
                            checked={selectedStudents.includes(student._id)}
                            onChange={() => handleStudentSelect(student._id)}
                          />
                          <label htmlFor={student._id} className="cursor-pointer select-none font-medium">
                            {student.nume} {student.prenume} <span className="ml-1 text-sm font-normal text-gray-500">({student.email})</span>
                          </label>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <p className="mt-2 text-sm font-bold text-blue-600">Total studenti selectati: {selectedStudents.length}</p>
              </div>
            </>
          )}

          {destination === 'PROFESSOR' && (
            <div className="mb-6 rounded border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
              Acest curs va fi creat pentru profesori. Nu se aloca studenti si nu se genereaza cereri de resurse pentru studenti.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Se creeaza...' : 'Creeaza Cursul'}
          </button>
        </form>

        <div className="mt-10 rounded border border-gray-200 bg-gray-50 p-6">
          <h2 className="mb-4 text-2xl font-bold">Cursuri pentru profesori</h2>
          {professorCoursesForList.length === 0 ? (
            <p className="text-sm text-gray-500">Nu exista inca cursuri destinate profesorilor.</p>
          ) : (
            <CourseListClient
              courses={professorCoursesForList}
              currentUserRole={currentUserRole}
              currentUserId={currentUserId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
