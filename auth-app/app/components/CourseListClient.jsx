'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CourseListClient({ courses: initialCourses, currentUserRole, currentUserId }) {
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [courseOverrides, setCourseOverrides] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const router = useRouter();

  const courses = initialCourses.map((course) => ({
    ...course,
    ...(courseOverrides[course._id] || {}),
  }));

  const handleEnroll = async (courseId) => {
    if (!confirm('Esti sigur ca vrei sa te inrolezi la acest curs?')) {
      return;
    }

    setLoadingId(courseId);
    try {
      const res = await fetch('/api/courses/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });

      const data = await res.json();

      if (res.ok) {
        const updatedCourse = courses.find((course) => course._id === courseId);
        if (updatedCourse) {
          setCourseOverrides((currentOverrides) => ({
            ...currentOverrides,
            [courseId]: {
              studentsCount: updatedCourse.studentsCount + 1,
              studentsList: [...updatedCourse.studentsList, currentUserId],
            },
          }));
        }
        router.refresh();
      } else {
        alert(`Eroare: ${data.message}`);
      }
    } catch (error) {
      alert('A aparut o problema la conexiune.');
    } finally {
      setLoadingId(null);
    }
  };

  const filteredCourses = showOnlyMine
    ? courses.filter((course) => course.studentsList.includes(currentUserId))
    : courses;

  return (
    <div className="mb-8 mt-6 rounded border border-gray-300 bg-gray-50 p-6">
      <div className="mb-4 flex flex-col items-start justify-between gap-4 border-b pb-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Lista de Cursuri</h2>
          {currentUserRole === 'Student' && (
            <p className="mt-1 text-sm text-gray-500">
              Poti vedea toate cursurile pentru studenti si poti filtra rapid doar cursurile la care esti deja inrolat.
            </p>
          )}
        </div>

        {currentUserRole === 'Student' && (
          <label className="flex cursor-pointer items-center rounded border bg-white px-3 py-2 text-sm font-bold text-blue-800 shadow-sm">
            <input
              type="checkbox"
              checked={showOnlyMine}
              onChange={(event) => setShowOnlyMine(event.target.checked)}
              className="mr-2 h-4 w-4 accent-blue-600"
            />
            Afiseaza doar cursurile mele
          </label>
        )}
      </div>

      {filteredCourses.length === 0 ? (
        <p className="italic text-gray-500">Momentan nu a fost gasit niciun curs conform filtrelor.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredCourses.map((course) => {
            const isEnrolled = course.studentsList.includes(currentUserId);
            const isStudentCourse = (course.destination || 'STUDENT') === 'STUDENT';
            const hasSeatsAvailable = !course.maxStudents || course.studentsCount < course.maxStudents;
            const canEnroll = currentUserRole === 'Student' && isStudentCourse && !isEnrolled && hasSeatsAvailable;
            const canOpenDetails = currentUserRole !== 'Student' || isEnrolled;

            return (
              <div key={course._id} className="relative flex flex-col rounded border bg-white p-4 text-sm shadow">
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-bold text-blue-600">{course.name}</h3>
                    {currentUserRole === 'Student' && isEnrolled && (
                      <span className="rounded-full border border-green-200 bg-green-50 px-2 py-1 text-[11px] font-bold text-green-700">
                        Inscris
                      </span>
                    )}
                  </div>
                  <p className="my-2 line-clamp-2 h-10 text-gray-600">{course.description}</p>
                </div>

                <div className="mt-4 flex flex-col gap-2 border-t pt-4 text-xs font-medium text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                  <span>Prof: {course.teacher ? `${course.teacher.nume} ${course.teacher.prenume}` : 'N/A'}</span>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-800">
                    Studenti: {course.studentsCount}{course.maxStudents ? ` / ${course.maxStudents}` : ''}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  {canOpenDetails ? (
                    <Link
                      href={`/courses/${course._id}`}
                      className="rounded bg-blue-600 py-2 text-center text-sm font-bold text-white hover:bg-blue-700"
                    >
                      Detalii curs
                    </Link>
                  ) : (
                    <div className="rounded border border-gray-200 bg-gray-50 py-2 text-center text-xs font-semibold text-gray-500">
                      Inscrie-te pentru a accesa detaliile cursului.
                    </div>
                  )}

                  {currentUserRole === 'Student' && (
                    <div>
                      {isEnrolled ? (
                        <div className="rounded border border-green-200 bg-green-50 py-2 text-center text-xs font-bold text-green-700">
                          Esti inscris la acest curs.
                        </div>
                      ) : canEnroll ? (
                        <button
                          onClick={() => handleEnroll(course._id)}
                          disabled={loadingId === course._id}
                          className="w-full rounded bg-blue-600 py-2 text-center text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                          {loadingId === course._id ? 'Se proceseaza...' : 'Inroleaza-te acum'}
                        </button>
                      ) : (
                        <div className="rounded border border-amber-200 bg-amber-50 py-2 text-center text-xs font-semibold text-amber-800">
                          {isStudentCourse
                            ? 'Inscriere indisponibila: cursul a atins numarul maxim de studenti.'
                            : 'Acest curs nu este disponibil pentru inscrierea studentilor.'}
                        </div>
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
