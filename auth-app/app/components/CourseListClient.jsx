'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CourseListClient({ courses: initialCourses, currentUserRole, currentUserId }) {
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [courses, setCourses] = useState(initialCourses);
  const [loadingId, setLoadingId] = useState(null);
  const router = useRouter();

  const handleEnroll = async (courseId) => {
    if (!confirm('Ești sigur că vrei să te înrolezi la acest curs?')) return;
    
    setLoadingId(courseId);
    try {
      const res = await fetch('/api/courses/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });

      const data = await res.json();
      
      if (res.ok) {
        // Actualizăm starea locală pentru un feedback vizual instant
        setCourses(courses.map(c => {
          if (c._id === courseId) {
            return {
              ...c,
              studentsCount: c.studentsCount + 1,
              studentsList: [...c.studentsList, currentUserId]
            };
          }
          return c;
        }));
        router.refresh(); // Sincronizăm și pagina pe server
      } else {
        alert(`Eroare: ${data.message}`);
      }
    } catch (error) {
      alert("A apărut o problemă la conexiune.");
    } finally {
      setLoadingId(null);
    }
  };

  const filteredCourses = showOnlyMine 
    ? courses.filter(c => c.studentsList.includes(currentUserId))
    : courses;

  return (
    <div className="bg-gray-50 border border-gray-300 p-6 rounded mb-8 mt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b pb-2 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">📋 Lista de Cursuri</h2>
        
        {currentUserRole === 'Student' && (
          <label className="flex items-center cursor-pointer bg-white border px-3 py-2 rounded shadow-sm text-sm font-bold text-blue-800">
            <input 
              type="checkbox" 
              checked={showOnlyMine} 
              onChange={(e) => setShowOnlyMine(e.target.checked)}
              className="mr-2 w-4 h-4 accent-blue-600"
            />
            Vezi doar cursurile mele
          </label>
        )}
      </div>

      {filteredCourses.length === 0 ? (
        <p className="text-gray-500 italic">Momentan nu a fost găsit niciun curs conform filtrelor.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCourses.map(c => {
             const isEnrolled = c.studentsList.includes(currentUserId);
             return (
               <div key={c._id} className="bg-white border rounded shadow p-4 text-sm relative flex flex-col">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-blue-600 truncate">{c.name}</h3>
                    <p className="text-gray-600 my-2 line-clamp-2 h-10">{c.description}</p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-gray-500 font-medium gap-3">
                    <span>👤 Prof: {c.teacher ? c.teacher.nume + ' ' + c.teacher.prenume : 'N/A'}</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">🎓 Studenți: {c.studentsCount}</span>
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    <Link href={`/courses/${c._id}`} className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 text-center py-2 rounded">
                      📘 Detalii curs
                    </Link>
                    {currentUserRole === 'Student' && (
                      <div>
                        {isEnrolled ? (
                          <div className="text-xs text-center font-bold text-green-700 bg-green-50 py-2 rounded border border-green-200">
                            ✅ Ești înscris la acest curs
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleEnroll(c._id)}
                            disabled={loadingId === c._id}
                            className="w-full text-xs text-center font-bold text-white bg-blue-600 hover:bg-blue-700 py-2 rounded transition-colors disabled:opacity-50"
                          >
                            {loadingId === c._id ? '⏳ Se procesează...' : '➕ Înrolează-te acum'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
               </div>
             );
          })}
        </div>
      )}
    </div>
  );
}