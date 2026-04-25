'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CourseDetailClient({ courseId, course, currentUserId, currentUserRole, isTeacher, isEnrolled }) {
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDescription, setMaterialDescription] = useState('');
  const [materialComment, setMaterialComment] = useState('');
  const [materialFile, setMaterialFile] = useState(null);
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [assignmentComment, setAssignmentComment] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceActionLoading, setWorkspaceActionLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [activityPrompt, setActivityPrompt] = useState('');
  const [activityResponse, setActivityResponse] = useState('');
  const [studentSummary, setStudentSummary] = useState(null);
  const [studentRequests, setStudentRequests] = useState([]);
  const [professorRequests, setProfessorRequests] = useState([]);
  const [manualTokenQuantity, setManualTokenQuantity] = useState(10);
  const [manualTokenReason, setManualTokenReason] = useState('');
  const [extraRequestType, setExtraRequestType] = useState('TOKEN');
  const [extraRequestQuantity, setExtraRequestQuantity] = useState(1);
  const [extraRequestReason, setExtraRequestReason] = useState('');
  const router = useRouter();

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity._id === selectedActivityId) || null,
    [activities, selectedActivityId]
  );

  const applyWorkspacePayload = useCallback((data) => {
    setActivities(data.activities || []);
    setStudentSummary(data.studentSummary || null);
    setStudentRequests(data.studentRequests || []);
    setProfessorRequests(data.professorRequests || []);

    if ((data.activities || []).length > 0) {
      const firstActivity = data.activities[0];
      const stillExists = data.activities.some((item) => item._id === selectedActivityId);
      if (!stillExists) {
        setSelectedActivityId(firstActivity._id);
        setActivityPrompt(firstActivity.taskPrompt || '');
      }
    }
  }, [selectedActivityId]);

  const loadWorkspace = useCallback(async () => {
    setWorkspaceLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/workspace`);
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || 'Nu am putut incarca zona de activitati.');
        return;
      }

      applyWorkspacePayload(data);
    } catch (error) {
      console.error(error);
      setMessage('Nu am putut incarca zona de activitati.');
    } finally {
      setWorkspaceLoading(false);
    }
  }, [applyWorkspacePayload, courseId]);

  useEffect(() => {
    let cancelled = false;

    async function initializeWorkspace() {
      setWorkspaceLoading(true);
      try {
        const res = await fetch(`/api/courses/${courseId}/workspace`);
        const data = await res.json();

        if (cancelled) {
          return;
        }

        if (!res.ok) {
          setMessage(data.message || 'Nu am putut incarca zona de activitati.');
          return;
        }

        applyWorkspacePayload(data);
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setMessage('Nu am putut incarca zona de activitati.');
        }
      } finally {
        if (!cancelled) {
          setWorkspaceLoading(false);
        }
      }
    }

    initializeWorkspace();

    return () => {
      cancelled = true;
    };
  }, [applyWorkspacePayload, courseId]);

  const handleMaterialUpload = async (event) => {
    event.preventDefault();
    if (!materialTitle || !materialFile) {
      setMessage('Completeaza titlul si ataseaza un fisier.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('title', materialTitle);
      formData.append('description', materialDescription);
      formData.append('comment', materialComment);
      formData.append('file', materialFile);

      const res = await fetch(`/api/courses/${courseId}/materials`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Material adaugat cu succes.');
        setMaterialTitle('');
        setMaterialDescription('');
        setMaterialComment('');
        setMaterialFile(null);
        router.refresh();
      } else {
        setMessage(data.message || 'Eroare la incarcare material.');
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
      setMessage('Alege un fisier pentru tema.');
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
        setMessage('Tema a fost incarcata cu succes.');
        setAssignmentFile(null);
        setAssignmentComment('');
        router.refresh();
      } else {
        setMessage(data.message || 'Eroare la incarcarea temei.');
      }
    } catch (error) {
      console.error(error);
      setMessage('Eroare la conexiune.');
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialDelete = async (materialId) => {
    if (!confirm('Esti sigur ca vrei sa stergi acest material?')) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(`/api/courses/${courseId}/materials`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Material sters cu succes.');
        router.refresh();
      } else {
        setMessage(data.message || 'Eroare la stergere.');
      }
    } catch (error) {
      console.error(error);
      setMessage('Eroare la conexiune.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentDelete = async (assignmentId) => {
    if (!confirm('Esti sigur ca vrei sa stergi aceasta tema?')) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(`/api/courses/${courseId}/assignments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Tema a fost stearsa cu succes.');
        router.refresh();
      } else {
        setMessage(data.message || 'Eroare la stergerea temei.');
      }
    } catch (error) {
      console.error(error);
      setMessage('Eroare la conexiune.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (fileUrl, fileName) => {
    try {
      const downloadUrl = `/api/download?url=${encodeURIComponent(fileUrl)}&name=${encodeURIComponent(fileName || 'download')}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Eroare la descarcare:', error);
      setMessage('Eroare la descarcare. Incearca mai tarziu.');
    }
  };

  const handleWorkspaceAction = async (action, extraBody = {}) => {
    setWorkspaceActionLoading(true);
    setMessage('');

    try {
      const res = await fetch(`/api/courses/${courseId}/workspace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraBody }),
      });
      const data = await res.json();

      if (res.ok) {
        setStudentSummary(data.studentSummary || null);
        setStudentRequests(data.studentRequests || []);
        if (data.latestLog?.response) {
          setActivityResponse(data.latestLog.response);
        }
        setMessage(data.message || 'Actiunea a fost procesata cu succes.');
      } else {
        setMessage(data.message || 'Nu am putut procesa actiunea.');
      }
    } catch (error) {
      console.error(error);
      setMessage('Eroare la conexiune.');
    } finally {
      setWorkspaceActionLoading(false);
    }
  };

  const handleActivityRun = async () => {
    if (!selectedActivity) {
      setMessage('Selecteaza o activitate.');
      return;
    }

    await handleWorkspaceAction('executeActivity', {
      activityId: selectedActivity._id,
      prompt: activityPrompt,
    });
  };

  const handleManualTokenSimulation = async (event) => {
    event.preventDefault();
    await handleWorkspaceAction('simulateTokenConsumption', {
      quantity: manualTokenQuantity,
      reason: manualTokenReason,
    });
    setManualTokenReason('');
  };

  const handleSubscriptionValidation = async () => {
    await handleWorkspaceAction('validateSubscriptionUsage', {
      reason: 'Validare manuala in pagina de curs.',
    });
  };

  const handleExtraRequestSubmit = async (event) => {
    event.preventDefault();
    setWorkspaceActionLoading(true);
    setMessage('');

    try {
      const res = await fetch(`/api/courses/${courseId}/student-resource-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: extraRequestType,
          quantity: extraRequestQuantity,
          reason: extraRequestReason,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setStudentRequests(data.studentRequests || []);
        setExtraRequestQuantity(1);
        setExtraRequestReason('');
        setMessage(data.message || 'Cererea a fost trimisa.');
      } else {
        setMessage(data.message || 'Nu am putut trimite cererea.');
      }
    } catch (error) {
      console.error(error);
      setMessage('Eroare la conexiune.');
    } finally {
      setWorkspaceActionLoading(false);
    }
  };

  const handleProfessorRequestDecision = async (requestId, decision) => {
    setWorkspaceActionLoading(true);
    setMessage('');

    try {
      const res = await fetch(`/api/courses/${courseId}/student-resource-requests`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, decision }),
      });
      const data = await res.json();

      if (res.ok) {
        setProfessorRequests(data.professorRequests || []);
        setMessage(data.message || 'Cererea a fost procesata.');
      } else {
        setMessage(data.message || 'Nu am putut procesa cererea.');
      }
    } catch (error) {
      console.error(error);
      setMessage('Eroare la conexiune.');
    } finally {
      setWorkspaceActionLoading(false);
    }
  };

  const handleActivitySelection = (activityId) => {
    setSelectedActivityId(activityId);
    const activity = activities.find((item) => item._id === activityId);
    setActivityPrompt(activity?.taskPrompt || '');
    setActivityResponse('');
  };

  return (
    <div className="space-y-8">
      {message && (
        <div className={`rounded border p-4 font-medium ${message.includes('succes') ? 'border-green-200 bg-green-100 text-green-800' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>
          {message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded border border-gray-200 bg-white p-6 shadow">
          <h2 className="mb-3 text-2xl font-bold">Despre curs</h2>
          <p className="mb-2 text-gray-700"><strong>Nume:</strong> {course.name}</p>
          <p className="mb-2 text-gray-700"><strong>Descriere:</strong> {course.description}</p>
          <p className="mb-2 text-gray-700"><strong>Profesor:</strong> {course.teacherName}</p>
          <p className="text-gray-700"><strong>Studenti inscrisi:</strong> {course.studentsCount}</p>
        </div>

        <div className="rounded border border-gray-200 bg-white p-6 shadow">
          <h2 className="mb-3 text-2xl font-bold">Acces</h2>
          <p className="mb-2 text-gray-700">Rol curent: <span className="font-semibold">{currentUserRole}</span></p>
          <p className="text-gray-700">{isEnrolled ? 'Esti inscris/a la acest curs.' : 'Nu esti inscris/a la acest curs.'}</p>
        </div>
      </div>

      {currentUserRole === 'Student' && (
        <section className="rounded border border-gray-200 bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">Resurse si activitati digitale</h2>
            {workspaceLoading && <span className="text-sm text-gray-500">Se incarca...</span>}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm text-gray-600">Tokenuri ramase</p>
                  <p className="text-2xl font-bold text-blue-800">{studentSummary?.remainingTokens ?? 0}</p>
                  <p className="mt-1 text-xs text-gray-600">Baza: {studentSummary?.baseTokens ?? 0} | Extra: {studentSummary?.extraTokens ?? 0}</p>
                </div>
                <div className="rounded border border-indigo-200 bg-indigo-50 p-4">
                  <p className="text-sm text-gray-600">Abonamente ramase</p>
                  <p className="text-2xl font-bold text-indigo-800">{studentSummary?.remainingSubscriptions ?? 0}</p>
                  <p className="mt-1 text-xs text-gray-600">Baza: {studentSummary?.baseSubscriptions ?? 0} | Extra: {studentSummary?.extraSubscriptions ?? 0}</p>
                </div>
                <div className="rounded border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm text-gray-600">Consum manual tokenuri</p>
                  <p className="text-2xl font-bold text-amber-800">{studentSummary?.manualTokenScore ?? 0}/5</p>
                  <p className="mt-1 text-xs text-gray-600">{studentSummary?.manualTokenActions ?? 0} actiuni x 0.5p</p>
                </div>
                <div className="rounded border border-green-200 bg-green-50 p-4">
                  <p className="text-sm text-gray-600">Validare abonament</p>
                  <p className="text-2xl font-bold text-green-800">{studentSummary?.subscriptionValidationScore ?? 0}/5</p>
                  <p className="mt-1 text-xs text-gray-600">Fara punctaj partial</p>
                </div>
              </div>

              <form onSubmit={handleManualTokenSimulation} className="rounded border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-3 text-lg font-semibold">Simulare consum manual tokenuri</h3>
                <div className="mb-3">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Cantitate</label>
                  <input
                    type="number"
                    min="1"
                    value={manualTokenQuantity}
                    onChange={(event) => setManualTokenQuantity(event.target.value)}
                    className="w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div className="mb-3">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Motiv</label>
                  <textarea
                    rows={3}
                    value={manualTokenReason}
                    onChange={(event) => setManualTokenReason(event.target.value)}
                    className="w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <button
                  type="submit"
                  disabled={workspaceActionLoading}
                  className="rounded bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  Simuleaza consumul
                </button>
              </form>

              <div className="rounded border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-3 text-lg font-semibold">Validare utilizare abonament</h3>
                <p className="mb-3 text-sm text-gray-600">Aceasta actiune simuleaza validarea utilizarii unui abonament si acorda punctaj doar la finalizare.</p>
                <button
                  type="button"
                  disabled={workspaceActionLoading}
                  onClick={handleSubscriptionValidation}
                  className="rounded bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Valideaza utilizarea
                </button>
              </div>

              <form onSubmit={handleExtraRequestSubmit} className="rounded border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-3 text-lg font-semibold">Solicita resurse suplimentare</h3>
                <div className="mb-3">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tip resursa</label>
                  <select
                    value={extraRequestType}
                    onChange={(event) => setExtraRequestType(event.target.value)}
                    className="w-full rounded border border-gray-300 p-2"
                  >
                    <option value="TOKEN">TOKEN</option>
                    <option value="SUBSCRIPTION">SUBSCRIPTION</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Cantitate</label>
                  <input
                    type="number"
                    min="1"
                    value={extraRequestQuantity}
                    onChange={(event) => setExtraRequestQuantity(event.target.value)}
                    className="w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <div className="mb-3">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Motiv</label>
                  <textarea
                    rows={3}
                    value={extraRequestReason}
                    onChange={(event) => setExtraRequestReason(event.target.value)}
                    className="w-full rounded border border-gray-300 p-2"
                  />
                </div>
                <button
                  type="submit"
                  disabled={workspaceActionLoading}
                  className="rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Trimite catre profesor
                </button>
              </form>
            </div>

            <div className="space-y-4">
              <div className="rounded border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-3 text-lg font-semibold">Ruleaza o activitate</h3>
                <div className="mb-3">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Activitate</label>
                  <select
                    value={selectedActivityId}
                    onChange={(event) => handleActivitySelection(event.target.value)}
                    className="w-full rounded border border-gray-300 p-2"
                  >
                    {activities.map((activity) => (
                      <option key={activity._id} value={activity._id}>
                        {activity.title} | {activity.tokenCost} tokenuri | {activity.subscriptionCost} abonamente
                      </option>
                    ))}
                  </select>
                </div>
                {selectedActivity && (
                  <>
                    <div className="mb-3 rounded border border-gray-200 bg-white p-3 text-sm text-gray-700">
                      <p className="font-semibold">{selectedActivity.title}</p>
                      <p className="mt-1">{selectedActivity.description}</p>
                      <p className="mt-2 text-xs text-gray-500">
                        Tip executie: {selectedActivity.executionType === 'VPS_PLACEHOLDER' ? 'VPS placeholder' : 'AI'}
                      </p>
                    </div>
                    <div className="mb-3">
                      <label className="mb-1 block text-sm font-medium text-gray-700">Cerinta pentru AI</label>
                      <textarea
                        rows={6}
                        value={activityPrompt}
                        onChange={(event) => setActivityPrompt(event.target.value)}
                        className="w-full rounded border border-gray-300 p-2"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={workspaceActionLoading}
                      onClick={handleActivityRun}
                      className="rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {selectedActivity.executionType === 'VPS_PLACEHOLDER' ? 'Ruleaza placeholder VPS' : 'Trimite la AI'}
                    </button>
                  </>
                )}
              </div>

              <div className="rounded border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-3 text-lg font-semibold">Raspuns</h3>
                <div className="min-h-[220px] rounded border border-gray-200 bg-white p-4 text-sm whitespace-pre-wrap">
                  {activityResponse || 'Aici va aparea raspunsul pentru activitatea selectata.'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 text-lg font-semibold">Cereri trimise de tine</h3>
              {studentRequests.length === 0 ? (
                <p className="text-sm text-gray-500">Nu ai trimis inca solicitari suplimentare.</p>
              ) : (
                <div className="space-y-3">
                  {studentRequests.map((request) => (
                    <div key={request._id} className="rounded border border-gray-200 bg-white p-3 text-sm">
                      <p className="font-semibold">{request.type} | {request.quantity}</p>
                      <p className="text-gray-600">{request.reason || 'Fara motiv specificat.'}</p>
                      <p className="mt-2 text-xs font-semibold text-blue-700">Status: {request.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 text-lg font-semibold">Istoric activitati</h3>
              {studentSummary?.logs?.length ? (
                <div className="space-y-3">
                  {studentSummary.logs.slice(0, 6).map((log) => (
                    <div key={log._id} className="rounded border border-gray-200 bg-white p-3 text-sm">
                      <p className="font-semibold">{log.activityTitle}</p>
                      <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString('ro-RO')}</p>
                      <p className="mt-2 text-gray-600">Tokenuri: {log.tokenConsumed} | Abonamente: {log.subscriptionConsumed}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nu exista activitati rulate inca.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {(currentUserRole === 'Profesor' || currentUserRole === 'Admin') && (
        <section className="rounded border border-gray-200 bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">Solicitari suplimentare de la studenti</h2>
            {workspaceLoading && <span className="text-sm text-gray-500">Se incarca...</span>}
          </div>
          {professorRequests.length === 0 ? (
            <p className="text-sm text-gray-500">Nu exista solicitari suplimentare pentru acest curs.</p>
          ) : (
            <div className="space-y-3">
              {professorRequests.map((request) => (
                <div key={request._id} className="rounded border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">{request.student?.nume} {request.student?.prenume}</p>
                      <p className="text-sm text-gray-600">{request.student?.email}</p>
                    </div>
                    <span className="rounded bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                      {request.type} | {request.quantity}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-gray-700">{request.reason || 'Fara motiv specificat.'}</p>
                  <p className="mt-2 text-xs font-semibold text-blue-700">Status: {request.status}</p>
                  {request.status === 'PENDING_PROFESSOR' && (
                    <div className="mt-3 flex gap-3">
                      <button
                        type="button"
                        disabled={workspaceActionLoading}
                        onClick={() => handleProfessorRequestDecision(request._id, 'FORWARD_TO_ADMIN')}
                        className="rounded bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Aproba si trimite la admin
                      </button>
                      <button
                        type="button"
                        disabled={workspaceActionLoading}
                        onClick={() => handleProfessorRequestDecision(request._id, 'REJECT')}
                        className="rounded bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Respinge
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {(currentUserRole === 'Profesor' || currentUserRole === 'Admin') && course.students && course.students.length > 0 && (
        <section className="rounded border border-gray-200 bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">Studenti inscrisi</h2>
            <span className="text-sm text-gray-500">{course.students.length} studenti</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {course.students.map((student) => (
              <div key={student._id} className="rounded border bg-blue-50 p-4">
                <p className="font-semibold text-blue-800">{student.nume} {student.prenume}</p>
                <p className="text-sm text-gray-600">{student.email}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded border border-gray-200 bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">Materiale curs</h2>
            <span className="text-sm text-gray-500">{course.materials.length} materiale</span>
          </div>

          {course.materials.length === 0 ? (
            <p className="text-gray-500">Momentan nu exista materiale incarcate.</p>
          ) : (
            <div className="space-y-3">
              {course.materials.map((material) => (
                <div key={material.fileUrl} className="rounded border bg-slate-50 p-4">
                  <h3 className="font-semibold text-blue-700">{material.title}</h3>
                  {material.description && <p className="mb-2 text-sm text-gray-600">{material.description}</p>}
                  {material.comment && <p className="mb-2 text-sm italic text-gray-600">Comentariu: {material.comment}</p>}
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                    <span>Incarcat: {new Date(material.uploadedAt).toLocaleString('ro-RO')}</span>
                    <span>de: {material.uploadedByName || 'Profesor'}</span>
                  </div>
                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={() => handleDownload(material.fileUrl, material.fileName)}
                      className="text-sm font-bold text-blue-700 hover:underline disabled:opacity-50"
                      disabled={loading}
                    >
                      Descarca material
                    </button>
                    {(currentUserRole === 'Admin' || (currentUserRole === 'Profesor' && material.teacherId === currentUserId)) && (
                      <button
                        onClick={() => handleMaterialDelete(material._id)}
                        disabled={loading}
                        className="text-sm font-bold text-red-700 hover:text-red-900 disabled:opacity-50"
                      >
                        Sterge
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isTeacher && (
            <form onSubmit={handleMaterialUpload} className="mt-6 space-y-4">
              <h3 className="text-xl font-semibold">Incarca material nou</h3>
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
                <label className="block text-sm font-medium text-gray-700">Comentariu optional</label>
                <textarea
                  value={materialComment}
                  onChange={(e) => setMaterialComment(e.target.value)}
                  className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fisier</label>
                <input
                  type="file"
                  onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Se incarca...' : 'Incarca material'}
              </button>
            </form>
          )}
        </section>

        <section className="rounded border border-gray-200 bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">Teme</h2>
            <span className="text-sm text-gray-500">{course.assignments.length} teme</span>
          </div>

          {currentUserRole === 'Student' ? (
            <>
              <form onSubmit={handleAssignmentUpload} className="mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ataseaza tema</label>
                  <input
                    type="file"
                    onChange={(e) => setAssignmentFile(e.target.files?.[0] || null)}
                    className="mt-1 block w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Comentariu optional</label>
                  <textarea
                    value={assignmentComment}
                    onChange={(e) => setAssignmentComment(e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                    rows={3}
                  />
                </div>
                <button type="submit" disabled={loading || !isEnrolled} className="inline-flex items-center justify-center rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50">
                  {loading ? 'Se incarca...' : 'Incarca tema'}
                </button>
              </form>

              {!isEnrolled && (
                <p className="text-sm text-red-600">Trebuie sa fii inscris/a la curs pentru a incarca tema.</p>
              )}

              <div className="space-y-3">
                {course.assignments.length === 0 ? (
                  <p className="text-gray-500">Nu ai incarcat nicio tema.</p>
                ) : (
                  course.assignments.map((assignment) => (
                    <div key={assignment.fileUrl} className="rounded border bg-slate-50 p-4">
                      <p className="font-semibold">Fisier: {assignment.fileName}</p>
                      <p className="text-sm text-gray-600">Trimis la: {new Date(assignment.submittedAt).toLocaleString('ro-RO')}</p>
                      {assignment.comment && <p className="text-sm text-gray-600">Comentariu: {assignment.comment}</p>}
                      <button
                        onClick={() => handleDownload(assignment.fileUrl, assignment.fileName)}
                        className="mt-3 inline-block text-sm font-bold text-blue-700 hover:underline disabled:opacity-50"
                        disabled={loading}
                      >
                        Descarca fisier
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {course.assignments.length === 0 ? (
                <p className="text-gray-500">Nicio tema trimisa inca.</p>
              ) : (
                course.assignments.map((assignment) => (
                  <div key={`${assignment.student}-${assignment.fileUrl}`} className="rounded border bg-slate-50 p-4">
                    <p className="font-semibold">Student: {assignment.studentName || 'Student'}</p>
                    <p className="text-sm text-gray-600">Fisier: {assignment.fileName}</p>
                    <p className="text-sm text-gray-600">Trimis la: {new Date(assignment.submittedAt).toLocaleString('ro-RO')}</p>
                    {assignment.comment && <p className="text-sm text-gray-600">Comentariu: {assignment.comment}</p>}
                    <div className="mt-3 flex gap-3">
                      <button
                        onClick={() => handleDownload(assignment.fileUrl, assignment.fileName)}
                        className="text-sm font-bold text-blue-700 hover:underline disabled:opacity-50"
                        disabled={loading}
                      >
                        Descarca tema
                      </button>
                      <button
                        onClick={() => handleAssignmentDelete(assignment._id)}
                        className="text-sm font-bold text-red-700 hover:text-red-900 disabled:opacity-50"
                        disabled={loading}
                      >
                        Sterge
                      </button>
                    </div>
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
