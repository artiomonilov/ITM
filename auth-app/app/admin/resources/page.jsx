'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const totalsInitialState = {
  totalTokens: 0,
  totalSubscriptions: 0,
};

const forwardedInitialState = {
  courseId: '',
  professorId: '',
  studentId: '',
  type: 'TOKEN',
  quantity: 1,
  reason: '',
};

export default function AdminResourcesPage() {
  const [data, setData] = useState(null);
  const [totals, setTotals] = useState(totalsInitialState);
  const [forwarded, setForwarded] = useState(forwardedInitialState);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingTotals, setSavingTotals] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [sendingForwarded, setSendingForwarded] = useState(false);
  const router = useRouter();

  async function loadData() {
    setLoading(true);
    const res = await fetch('/api/admin/resources');
    const payload = await res.json();

    if (res.ok) {
      setData(payload);
      setTotals({
        totalTokens: payload.inventory?.totalTokens || 0,
        totalSubscriptions: payload.inventory?.totalSubscriptions || 0,
      });
    } else {
      setMessage(payload.message || 'Nu am putut încărca resursele.');
    }

    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const session = await getSession();
      if (!session || session.user.role !== 'Admin') {
        router.push('/dashboard');
        return;
      }

      await loadData();
    }

    init();
  }, [router]);

  async function saveTotals(event) {
    event.preventDefault();
    setSavingTotals(true);
    setMessage('');

    const res = await fetch('/api/admin/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateTotals', ...totals }),
    });
    const payload = await res.json();

    if (res.ok) {
      setData(payload.data);
      setMessage(payload.message);
    } else {
      setMessage(payload.message || 'Nu am putut salva inventarul.');
    }

    setSavingTotals(false);
  }

  async function resolveRequest(requestId, decision) {
    setProcessingId(requestId);
    setMessage('');

    const res = await fetch('/api/admin/resources', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, decision }),
    });
    const payload = await res.json();

    if (res.ok) {
      setData(payload.data);
      setMessage(payload.message);
    } else {
      setMessage(payload.message || 'Nu am putut procesa cererea.');
    }

    setProcessingId(null);
  }

  async function submitForwarded(event) {
    event.preventDefault();
    setSendingForwarded(true);
    setMessage('');

    const res = await fetch('/api/admin/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'forwardExtraRequest', ...forwarded }),
    });
    const payload = await res.json();

    if (res.ok) {
      setData(payload.data);
      setForwarded(forwardedInitialState);
      setMessage(payload.message);
    } else {
      setMessage(payload.message || 'Nu am putut înregistra cererea suplimentară.');
    }

    setSendingForwarded(false);
  }

  const pendingRequests = data?.requests?.filter((item) => item.status === 'PENDING') || [];
  const approvedRequests = data?.requests?.filter((item) => item.status === 'APPROVED') || [];
  const selectedCourse = data?.courses?.find((course) => course._id === forwarded.courseId);

  return (
    <div className="min-h-screen bg-gray-100 p-8 text-black">
      <div className="mx-auto max-w-7xl rounded bg-white p-8 shadow-md">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestionează resurse</h1>
            <p className="text-sm text-gray-600">Inventar central, distribuire către profesori și aprobări pentru cereri suplimentare.</p>
          </div>
          <div className="flex gap-3 text-sm font-semibold">
            <Link href="/dashboard" className="text-blue-600 hover:underline">Înapoi la Dashboard</Link>
            <Link href="/admin/activities" className="text-blue-600 hover:underline">Gestionează activități</Link>
            <Link href="/admin/roles" className="text-blue-600 hover:underline">Gestionează utilizatori</Link>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-3 font-semibold text-blue-800">
            {message}
          </div>
        )}

        {loading || !data ? (
          <p className="text-gray-500">Se încarcă resursele administratorului...</p>
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Total tokenuri</p>
                <p className="text-2xl font-bold">{data.inventory?.totalTokens || 0}</p>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Total abonamente</p>
                <p className="text-2xl font-bold">{data.inventory?.totalSubscriptions || 0}</p>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Tokenuri deja alocate</p>
                <p className="text-2xl font-bold">{data.usage?.TOKEN || 0}</p>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Abonamente deja alocate</p>
                <p className="text-2xl font-bold">{data.usage?.SUBSCRIPTION || 0}</p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
              <form onSubmit={saveTotals} className="rounded border border-gray-200 bg-gray-50 p-5">
                <h2 className="mb-4 text-xl font-bold">Inventarul universității</h2>

                <label className="mb-2 block text-sm font-semibold">Număr total tokenuri</label>
                <input
                  type="number"
                  min="0"
                  className="mb-4 w-full rounded border border-gray-300 p-2"
                  value={totals.totalTokens}
                  onChange={(event) => setTotals((current) => ({ ...current, totalTokens: event.target.value }))}
                  required
                />

                <label className="mb-2 block text-sm font-semibold">Număr total abonamente</label>
                <input
                  type="number"
                  min="0"
                  className="mb-4 w-full rounded border border-gray-300 p-2"
                  value={totals.totalSubscriptions}
                  onChange={(event) => setTotals((current) => ({ ...current, totalSubscriptions: event.target.value }))}
                  required
                />

                <button
                  type="submit"
                  disabled={savingTotals}
                  className="w-full rounded bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingTotals ? 'Se salvează...' : 'Actualizează resursele totale'}
                </button>
              </form>

              <div className="rounded border border-gray-200 p-5">
                <h2 className="mb-4 text-xl font-bold">Cursuri și necesarul declarat de profesori</h2>
                <div className="grid gap-3">
                  {data.courses.length === 0 ? (
                    <p className="text-sm text-gray-500">Nu există încă cursuri create.</p>
                  ) : (
                    data.courses.map((course) => (
                      <div key={course._id} className="rounded border border-gray-200 bg-gray-50 p-4 text-sm">
                        <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <h3 className="font-bold text-gray-900">{course.name}</h3>
                          <span className="rounded bg-green-100 px-2 py-1 text-xs font-bold text-green-800">
                            Extra profesor: {course.resourceRequirements?.tokenExtraAllowance || 0} tokenuri / {course.resourceRequirements?.subscriptionExtraAllowance || 0} abonamente
                          </span>
                        </div>
                        <p className="text-gray-600">
                          Profesor: {course.teacher?.nume} {course.teacher?.prenume} ({course.teacher?.email})
                        </p>
                        <p className="text-gray-600">
                          Max studenți: {course.maxStudents || 0} | Necesitate totală: {course.resourceRequirements?.tokenTotalRequested || 0} tokenuri, {course.resourceRequirements?.subscriptionTotalRequested || 0} abonamente
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
              <div className="rounded border border-gray-200 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold">Cereri de aprobare</h2>
                  <span className="rounded bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-800">
                    În așteptare: {pendingRequests.length}
                  </span>
                </div>

                <div className="grid gap-3">
                  {pendingRequests.length === 0 ? (
                    <p className="text-sm text-gray-500">Nu există cereri în așteptare.</p>
                  ) : (
                    pendingRequests.map((request) => (
                      <div key={request._id} className="rounded border border-gray-200 bg-gray-50 p-4 text-sm">
                        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-bold">{request.courseId?.name || 'Curs necunoscut'}</h3>
                            <p className="text-gray-600">
                              Profesor: {request.professorId?.nume} {request.professorId?.prenume}
                            </p>
                          </div>
                          <span className="rounded bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                            {request.type} | {request.scope}
                          </span>
                        </div>
                        <p className="text-gray-700">Cantitate solicitată: <strong>{request.quantity}</strong></p>
                        {request.studentId && (
                          <p className="text-gray-700">
                            Student: {request.studentId.nume} {request.studentId.prenume} ({request.studentId.email})
                          </p>
                        )}
                        <p className="mb-3 text-gray-600">{request.reason || 'Fără motiv specificat.'}</p>

                        <div className="flex gap-3">
                          <button
                            onClick={() => resolveRequest(request._id, 'APPROVED')}
                            disabled={processingId === request._id}
                            className="rounded bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Aprobă
                          </button>
                          <button
                            onClick={() => resolveRequest(request._id, 'REJECTED')}
                            disabled={processingId === request._id}
                            className="rounded bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Respinge
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <form onSubmit={submitForwarded} className="rounded border border-gray-200 bg-gray-50 p-5">
                <h2 className="mb-4 text-xl font-bold">Flux aprobare extra-resurse</h2>
                <p className="mb-4 text-sm text-gray-600">
                  Înregistrează aici o cerere înaintată de profesor atunci când solicitarea studentului depășește suplimentarul de 10%.
                </p>

                <label className="mb-2 block text-sm font-semibold">Curs</label>
                <select
                  className="mb-4 w-full rounded border border-gray-300 p-2"
                  value={forwarded.courseId}
                  onChange={(event) => {
                    const selectedCourse = data.courses.find((course) => course._id === event.target.value);
                    setForwarded((current) => ({
                      ...current,
                      courseId: event.target.value,
                      professorId: selectedCourse?.teacher?._id || '',
                    }));
                  }}
                  required
                >
                  <option value="">Selectează cursul</option>
                  {data.courses.map((course) => (
                    <option key={course._id} value={course._id}>{course.name}</option>
                  ))}
                </select>

                <label className="mb-2 block text-sm font-semibold">Student (opțional)</label>
                <select
                  className="mb-4 w-full rounded border border-gray-300 p-2"
                  value={forwarded.studentId}
                  onChange={(event) => setForwarded((current) => ({ ...current, studentId: event.target.value }))}
                >
                  <option value="">Fără student specific</option>
                  {(selectedCourse?.students || []).map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.nume} {student.prenume} ({student.email})
                    </option>
                  ))}
                </select>

                <label className="mb-2 block text-sm font-semibold">Tip resursă</label>
                <select
                  className="mb-4 w-full rounded border border-gray-300 p-2"
                  value={forwarded.type}
                  onChange={(event) => setForwarded((current) => ({ ...current, type: event.target.value }))}
                >
                  <option value="TOKEN">TOKEN</option>
                  <option value="SUBSCRIPTION">SUBSCRIPTION</option>
                </select>

                <label className="mb-2 block text-sm font-semibold">Cantitate</label>
                <input
                  type="number"
                  min="1"
                  className="mb-4 w-full rounded border border-gray-300 p-2"
                  value={forwarded.quantity}
                  onChange={(event) => setForwarded((current) => ({ ...current, quantity: event.target.value }))}
                  required
                />

                <label className="mb-2 block text-sm font-semibold">Motiv</label>
                <textarea
                  className="mb-4 w-full rounded border border-gray-300 p-2"
                  rows={4}
                  value={forwarded.reason}
                  onChange={(event) => setForwarded((current) => ({ ...current, reason: event.target.value }))}
                  placeholder="Ex: studentul depășește suplimentarul profesorului de 10%."
                />

                <button
                  type="submit"
                  disabled={sendingForwarded}
                  className="w-full rounded bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {sendingForwarded ? 'Se transmite...' : 'Trimite spre aprobare admin'}
                </button>
              </form>
            </div>

            <div className="rounded border border-gray-200 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Cereri aprobate</h2>
                <span className="rounded bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
                  Aprobate: {approvedRequests.length}
                </span>
              </div>

              <div className="grid gap-3">
                {approvedRequests.length === 0 ? (
                  <p className="text-sm text-gray-500">Nu există încă aprobări finalizate.</p>
                ) : (
                  approvedRequests.map((request) => (
                    <div key={request._id} className="rounded border border-gray-200 bg-gray-50 p-4 text-sm">
                      <p className="font-bold">{request.courseId?.name || 'Curs necunoscut'}</p>
                      <p className="text-gray-600">
                        {request.type} | {request.quantity} | {request.scope}
                      </p>
                      <p className="text-gray-600">
                        Profesor: {request.professorId?.nume} {request.professorId?.prenume}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
