'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

function ActivityTable({ activities, emptyText }) {
  if (!activities || activities.length === 0) {
    return <p className="text-sm text-gray-500">{emptyText}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="py-2 pr-4">Activitate</th>
            <th className="py-2 pr-4">Cost token</th>
            <th className="py-2 pr-4">Cost abonamente</th>
            <th className="py-2 pr-4">Numar utilizari</th>
            <th className="py-2 pr-4">Total tokenuri folosite</th>
            <th className="py-2">Total abonamente folosite</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <tr key={`${activity.activityId || activity.activityTitle}`} className="border-b border-gray-100">
              <td className="py-2 pr-4">{activity.activityTitle}</td>
              <td className="py-2 pr-4">{activity.tokenCost}</td>
              <td className="py-2 pr-4">{activity.subscriptionCost}</td>
              <td className="py-2 pr-4">{activity.usagesCount}</td>
              <td className="py-2 pr-4 font-semibold">{activity.totalTokensUsed}</td>
              <td className="py-2 font-semibold">{activity.totalSubscriptionsUsed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminStatisticsPage() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const session = await getSession();
      if (!session || session.user.role !== 'Admin') {
        router.push('/dashboard');
        return;
      }

      const res = await fetch('/api/admin/statistics');
      const payload = await res.json();

      if (res.ok) {
        setData(payload);
        setSelectedStudentId(payload.studentStats?.[0]?.studentId || '');
        setSelectedCourseId(payload.courseStats?.[0]?.courseId || '');
      } else {
        setMessage(payload.message || 'Nu am putut incarca statisticile.');
      }

      setLoading(false);
    }

    init();
  }, [router]);

  const selectedStudent = useMemo(
    () => data?.studentStats?.find((entry) => entry.studentId === selectedStudentId) || null,
    [data, selectedStudentId],
  );

  const selectedCourse = useMemo(
    () => data?.courseStats?.find((entry) => entry.courseId === selectedCourseId) || null,
    [data, selectedCourseId],
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8 text-black">
      <div className="mx-auto max-w-7xl rounded bg-white p-8 shadow-md">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Statistici resurse</h1>
            <p className="text-sm text-gray-600">Vizualizare pe student, curs si universitate pentru resursele alocate si folosite.</p>
          </div>
          <div className="flex gap-3 text-sm font-semibold">
            <Link href="/dashboard" className="text-blue-600 hover:underline">Inapoi la Dashboard</Link>
            <Link href="/admin/resources" className="text-blue-600 hover:underline">Gestioneaza resurse</Link>
            <Link href="/admin/activities" className="text-blue-600 hover:underline">Gestioneaza activitati</Link>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 font-semibold text-red-800">
            {message}
          </div>
        )}

        {loading || !data ? (
          <p className="text-gray-500">Se incarca statisticile...</p>
        ) : (
          <div className="space-y-8">
            <section className="rounded border border-gray-200 bg-gray-50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Nivel universitate</h2>
                <span className="rounded bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800">
                  Imagine globala
                </span>
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-500">Inventar total tokenuri</p>
                  <p className="text-2xl font-bold">{data.universityStats.totalTokensInventory}</p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-500">Tokenuri nealocate</p>
                  <p className="text-2xl font-bold">{data.universityStats.availableTokens}</p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-500">Tokenuri alocate</p>
                  <p className="text-2xl font-bold">{data.universityStats.allocatedTokens}</p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-500">Tokenuri folosite</p>
                  <p className="text-2xl font-bold">{data.universityStats.totalTokensUsed}</p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-500">Tokenuri ramase in alocari</p>
                  <p className="text-2xl font-bold">{data.universityStats.remainingAllocatedTokens}</p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-500">Inventar total abonamente</p>
                  <p className="text-2xl font-bold">{data.universityStats.totalSubscriptionsInventory}</p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-500">Abonamente nealocate</p>
                  <p className="text-2xl font-bold">{data.universityStats.availableSubscriptions}</p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-500">Abonamente alocate</p>
                  <p className="text-2xl font-bold">{data.universityStats.allocatedSubscriptions}</p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-500">Abonamente utilizate</p>
                  <p className="text-2xl font-bold">{data.universityStats.totalSubscriptionsUsed}</p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-500">Abonamente ramase in alocari</p>
                  <p className="text-2xl font-bold">{data.universityStats.remainingAllocatedSubscriptions}</p>
                </div>
              </div>

              <ActivityTable
                activities={data.universityStats.activityBreakdown}
                emptyText="Nu exista inca utilizari de tokenuri inregistrate la nivel de universitate."
              />
            </section>

            <section className="rounded border border-gray-200 bg-gray-50 p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold">Nivel curs</h2>
                <select
                  className="rounded border border-gray-300 bg-white p-2 text-sm"
                  value={selectedCourseId}
                  onChange={(event) => setSelectedCourseId(event.target.value)}
                >
                  {data.courseStats.map((course) => (
                    <option key={course.courseId} value={course.courseId}>
                      {course.courseName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCourse ? (
                <>
                  <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
                    <div className="rounded border border-gray-200 bg-white p-4">
                      <p className="text-sm text-gray-500">Profesor</p>
                      <p className="text-base font-bold">{selectedCourse.teacherName}</p>
                    </div>
                    <div className="rounded border border-gray-200 bg-white p-4">
                      <p className="text-sm text-gray-500">Studenti inscrisi</p>
                      <p className="text-2xl font-bold">{selectedCourse.studentsCount}</p>
                    </div>
                    <div className="rounded border border-gray-200 bg-white p-4">
                      <p className="text-sm text-gray-500">Tokenuri alocate</p>
                      <p className="text-2xl font-bold">{selectedCourse.allocatedTokens}</p>
                    </div>
                    <div className="rounded border border-gray-200 bg-white p-4">
                      <p className="text-sm text-gray-500">Tokenuri folosite</p>
                      <p className="text-2xl font-bold">{selectedCourse.totalTokensUsed}</p>
                    </div>
                    <div className="rounded border border-gray-200 bg-white p-4">
                      <p className="text-sm text-gray-500">Tokenuri ramase</p>
                      <p className="text-2xl font-bold">{selectedCourse.remainingTokens}</p>
                    </div>
                    <div className="rounded border border-gray-200 bg-white p-4">
                      <p className="text-sm text-gray-500">Abonamente alocate</p>
                      <p className="text-2xl font-bold">{selectedCourse.allocatedSubscriptions}</p>
                    </div>
                    <div className="rounded border border-gray-200 bg-white p-4">
                      <p className="text-sm text-gray-500">Abonamente utilizate</p>
                      <p className="text-2xl font-bold">{selectedCourse.totalSubscriptionsUsed}</p>
                    </div>
                    <div className="rounded border border-gray-200 bg-white p-4">
                      <p className="text-sm text-gray-500">Abonamente ramase</p>
                      <p className="text-2xl font-bold">{selectedCourse.remainingSubscriptions}</p>
                    </div>
                  </div>

                  <ActivityTable
                    activities={selectedCourse.activityBreakdown}
                    emptyText="Nu exista inca utilizari de tokenuri pentru acest curs."
                  />
                </>
              ) : (
                <p className="text-sm text-gray-500">Nu exista cursuri disponibile pentru statistici.</p>
              )}
            </section>

            <section className="rounded border border-gray-200 bg-gray-50 p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold">Nivel student</h2>
                <select
                  className="rounded border border-gray-300 bg-white p-2 text-sm"
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                >
                  {data.studentStats.map((student) => (
                    <option key={student.studentId} value={student.studentId}>
                      {student.studentName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStudent ? (
                <>
                  <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
                    <div className="rounded border border-gray-200 bg-white p-4 xl:col-span-2">
                      <p className="text-sm text-gray-500">Student</p>
                      <p className="text-base font-bold">{selectedStudent.studentName}</p>
                      <p className="text-sm text-gray-600">{selectedStudent.email}</p>
                    </div>
                    <div className="rounded border border-gray-200 bg-white p-4">
                      <p className="text-sm text-gray-500">Tokenuri alocate</p>
                      <p className="text-2xl font-bold">{selectedStudent.allocatedTokens}</p>
                    </div>
                    <div className="rounded border border-gray-200 bg-white p-4">
                      <p className="text-sm text-gray-500">Tokenuri folosite</p>
                      <p className="text-2xl font-bold">{selectedStudent.totalTokensUsed}</p>
                    </div>
                    <div className="rounded border border-gray-200 bg-white p-4">
                      <p className="text-sm text-gray-500">Tokenuri ramase</p>
                      <p className="text-2xl font-bold">{selectedStudent.remainingTokens}</p>
                    </div>
                    <div className="rounded border border-gray-200 bg-white p-4">
                      <p className="text-sm text-gray-500">Abonamente alocate</p>
                      <p className="text-2xl font-bold">{selectedStudent.allocatedSubscriptions}</p>
                    </div>
                    <div className="rounded border border-gray-200 bg-white p-4">
                      <p className="text-sm text-gray-500">Abonamente utilizate</p>
                      <p className="text-2xl font-bold">{selectedStudent.totalSubscriptionsUsed}</p>
                    </div>
                    <div className="rounded border border-gray-200 bg-white p-4">
                      <p className="text-sm text-gray-500">Abonamente ramase</p>
                      <p className="text-2xl font-bold">{selectedStudent.remainingSubscriptions}</p>
                    </div>
                  </div>

                  <ActivityTable
                    activities={selectedStudent.activityBreakdown}
                    emptyText="Nu exista inca utilizari de tokenuri pentru acest student."
                  />
                </>
              ) : (
                <p className="text-sm text-gray-500">Nu exista studenti disponibili pentru statistici.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
