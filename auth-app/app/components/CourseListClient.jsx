'use client';
import { useState } from 'react';

export default function CourseListClient({ courses, currentUserRole, currentUserId }) {
  const [showOnlyMine, setShowOnlyMine] = useState(false);

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
               <div key={c._id} className="bg-white border rounded shadow p-4 text-sm relative">
                  <h3 className="text-lg font-bold text-blue-600 truncate">{c.name}</h3>
                  <p className="text-gray-600 my-2 line-clamp-2 h-10">{c.description}</p>
                  
                  <div className="mt-4 pt-4 border-t flex justify-between items-center text-xs text-gray-500 font-medium">
                    <span>👤 Prof: {c.teacher ? c.teacher.nume + ' ' + c.teacher.prenume : 'N/A'}</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">🎓 Studenți: {c.studentsCount}</span>
                  </div>
                  
                  {currentUserRole === 'Student' && isEnrolled && (
                    <div className="mt-2 text-xs text-center font-bold text-green-700 bg-green-50 py-1 rounded border border-green-200">✅ Ești înscris la acest curs</div>
                  )}
               </div>
             );
          })}
        </div>
      )}
    </div>
  );
}