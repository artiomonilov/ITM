'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CourseDetailClient({ courseId, course, currentUserId, currentUserRole, isTeacher, isEnrolled }) {
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDescription, setMaterialDescription] = useState('');
  const [materialFile, setMaterialFile] = useState(null);
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [assignmentComment, setAssignmentComment] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleMaterialUpload = async (event) => {
    event.preventDefault();
    if (!materialTitle || !materialFile) {
      setMessage('Completează titlul și atașează un fișier.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('title', materialTitle);
      formData.append('description', materialDescription);
      formData.append('file', materialFile);

      const res = await fetch(`/api/courses/${courseId}/materials`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Material adăugat cu succes.');
        setMaterialTitle('');
        setMaterialDescription('');
        setMaterialFile(null);
        router.refresh();
      } else {
        setMessage(data.message || 'Eroare la încărcare material.');
      }
    } catch (error) {
      console.error(error);
      setMessage('Eroare la conexiune.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentUpload = async (event) => {
    event.preventDefault();
    if (!assignmentFile) {
      setMessage('Alege un fișier pentru temă.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', assignmentFile);
      formData.append('comment', assignmentComment);

      const res = await fetch(`/api/courses/${courseId}/assignments`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Tema a fost încărcată cu succes.');
        setAssignmentFile(null);
        setAssignmentComment('');
        router.refresh();
      } else {
        setMessage(data.message || 'Eroare la încărcarea temei.');
      }
    } catch (error) {
      console.error(error);
      setMessage('Eroare la conexiune.');
    } finally {
      setLoading(false);
    }
  };

  const ownAssignment = course.assignments?.find(a => a.student === currentUserId);

  return (
    <div className="space-y-8">
      {message && (
        <div className={`p-4 rounded font-medium ${message.includes('succes') ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
          {message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="bg-white rounded shadow p-6 border border-gray-200">
          <h2 className="text-2xl font-bold mb-3">Despre curs</h2>
          <p className="text-gray-700 mb-2"><strong>Nume:</strong> {course.name}</p>
          <p className="text-gray-700 mb-2"><strong>Descriere:</strong> {course.description}</p>
          <p className="text-gray-700 mb-2"><strong>Profesor:</strong> {course.teacherName}</p>
          <p className="text-gray-700"><strong>Studenți înscriși:</strong> {course.studentsCount}</p>
        </div>

        <div className="bg-white rounded shadow p-6 border border-gray-200">
          <h2 className="text-2xl font-bold mb-3">Acces</h2>
          <p className="text-gray-700 mb-2">Rol curent: <span className="font-semibold">{currentUserRole}</span></p>
          <p className="text-gray-700">{isEnrolled ? 'Ești înscris/ă la acest curs.' : 'Nu ești înscris/ă la acest curs.'}</p>
        </div>
      </div>

      {(currentUserRole === 'Profesor' || currentUserRole === 'Admin') && course.students && course.students.length > 0 && (
        <section className="bg-white rounded shadow p-6 border border-gray-200">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">Studenți înscriși</h2>
            <span className="text-sm text-gray-500">{course.students.length} studenți</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {course.students.map((student) => (
              <div key={student._id} className="border rounded p-4 bg-blue-50">
                <p className="font-semibold text-blue-800">{student.nume} {student.prenume}</p>
                <p className="text-sm text-gray-600">{student.email}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="bg-white rounded shadow p-6 border border-gray-200">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">Materiale curs</h2>
            <span className="text-sm text-gray-500">{course.materials.length} materiale</span>
          </div>

          {course.materials.length === 0 ? (
            <p className="text-gray-500">Momentan nu există materiale încărcate.</p>
          ) : (
            <div className="space-y-3">
              {course.materials.map((material) => (
                <div key={material.fileUrl} className="border rounded p-4 bg-slate-50">
                  <h3 className="font-semibold text-blue-700">{material.title}</h3>
                  {material.description && <p className="text-sm text-gray-600 mb-2">{material.description}</p>}
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                    <span>Încarcat: {new Date(material.uploadedAt).toLocaleString('ro-RO')}</span>
                    <span>de: {material.uploadedByName || 'Profesor'}</span>
                  </div>
                  <a href={material.fileUrl} target="_blank" rel="noreferrer" className="inline-block mt-3 text-sm font-bold text-blue-700 hover:underline">
                    Descarcă material
                  </a>
                </div>
              ))}
            </div>
          )}

          {isTeacher && (
            <form onSubmit={handleMaterialUpload} className="mt-6 space-y-4">
              <h3 className="text-xl font-semibold">Încarcă material nou</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Titlu material</label>
                <input
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Descriere</label>
                <textarea
                  value={materialDescription}
                  onChange={(e) => setMaterialDescription(e.target.value)}
                  className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fișier</label>
                <input
                  type="file"
                  onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Se încarcă...' : 'Încarcă material'}
              </button>
            </form>
          )}
        </section>

        <section className="bg-white rounded shadow p-6 border border-gray-200">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">Teme</h2>
            <span className="text-sm text-gray-500">{course.assignments.length} teme</span>
          </div>

          {currentUserRole === 'Student' ? (
            <>
              <form onSubmit={handleAssignmentUpload} className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Atașează tema</label>
                  <input
                    type="file"
                    onChange={(e) => setAssignmentFile(e.target.files?.[0] || null)}
                    className="mt-1 block w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Comentariu opțional</label>
                  <textarea
                    value={assignmentComment}
                    onChange={(e) => setAssignmentComment(e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                    rows={3}
                  />
                </div>
                <button type="submit" disabled={loading || !isEnrolled} className="inline-flex items-center justify-center rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50">
                  {loading ? 'Se încarcă...' : 'Încarcă tema'}
                </button>
              </form>

              {!isEnrolled && (
                <p className="text-sm text-red-600">Trebuie să fii înscris/ă la curs pentru a încărca tema.</p>
              )}

              <div className="space-y-3">
                {course.assignments.length === 0 ? (
                  <p className="text-gray-500">Nu ai încărcat nici o temă.</p>
                ) : (
                  course.assignments.map((assignment) => (
                    <div key={assignment.fileUrl} className="border rounded p-4 bg-slate-50">
                      <p className="font-semibold">Fișier: {assignment.fileName}</p>
                      <p className="text-sm text-gray-600">Trimis la: {new Date(assignment.submittedAt).toLocaleString('ro-RO')}</p>
                      {assignment.comment && <p className="text-sm text-gray-600">Comentariu: {assignment.comment}</p>}
                      <a href={assignment.fileUrl} target="_blank" rel="noreferrer" className="inline-block mt-3 text-sm font-bold text-blue-700 hover:underline">
                        Descarcă fișier
                      </a>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {course.assignments.length === 0 ? (
                <p className="text-gray-500">Nicio temă trimisă încă.</p>
              ) : (
                course.assignments.map((assignment) => (
                  <div key={`${assignment.student}-${assignment.fileUrl}`} className="border rounded p-4 bg-slate-50">
                    <p className="font-semibold">Student: {assignment.studentName || 'Student'}</p>
                    <p className="text-sm text-gray-600">Fișier: {assignment.fileName}</p>
                    <p className="text-sm text-gray-600">Trimis la: {new Date(assignment.submittedAt).toLocaleString('ro-RO')}</p>
                    {assignment.comment && <p className="text-sm text-gray-600">Comentariu: {assignment.comment}</p>}
                    <a href={assignment.fileUrl} target="_blank" rel="noreferrer" className="inline-block mt-3 text-sm font-bold text-blue-700 hover:underline">
                      Descarcă tema
                    </a>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
