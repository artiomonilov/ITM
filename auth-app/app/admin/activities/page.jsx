'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const initialForm = {
  title: '',
  description: '',
  taskPrompt: '',
  tokenCost: 0,
  subscriptionCost: 0,
  executionType: 'AI',
  aiResourceType: 'text',
};

async function readJsonSafe(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function AdminActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const session = await getSession();
      if (!session || session.user.role !== 'Admin') {
        router.push('/dashboard');
        return;
      }

      if (!cancelled) {
        await loadActivities();
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function loadActivities() {
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/activities');
      const data = await readJsonSafe(res);

      if (res.ok) {
        setActivities(Array.isArray(data) ? data : []);
      } else {
        setMessage(data?.message || 'Nu am putut incarca activitatile.');
      }
    } catch (error) {
      console.error(error);
      setMessage('Nu am putut incarca activitatile.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tokenCost: Number(form.tokenCost) || 0,
          subscriptionCost: Number(form.subscriptionCost) || 0,
        }),
      });
      const data = await readJsonSafe(res);

      if (res.ok) {
        setForm(initialForm);
        setMessage(data?.message || 'Activitatea a fost salvata.');
        await loadActivities();
      } else {
        setMessage(data?.message || 'Nu am putut salva activitatea.');
      }
    } catch (error) {
      console.error(error);
      setMessage('Nu am putut salva activitatea.');
    } finally {
      setSaving(false);
    }
  }

  function onChange(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 text-black">
      <div className="mx-auto max-w-6xl rounded bg-white p-8 shadow-md">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestioneaza activitati</h1>
            <p className="text-sm text-gray-600">
              Administratorul defineste activitatile disponibile in curs, cu consum de tokenuri sau abonamente.
            </p>
          </div>
          <div className="flex gap-3 text-sm font-semibold">
            <Link href="/dashboard" className="text-blue-600 hover:underline">Inapoi la Dashboard</Link>
            <Link href="/admin/resources" className="text-blue-600 hover:underline">Gestioneaza resurse</Link>
            <Link href="/admin/roles" className="text-blue-600 hover:underline">Gestioneaza utilizatori</Link>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-3 font-semibold text-blue-700">
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
          <form onSubmit={handleSubmit} className="rounded border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 text-xl font-bold">Adauga activitate</h2>

            <label className="mb-2 block text-sm font-semibold">Denumire</label>
            <input
              className="mb-4 w-full rounded border border-gray-300 p-2"
              value={form.title}
              onChange={(event) => onChange('title', event.target.value)}
              required
            />

            <label className="mb-2 block text-sm font-semibold">Descriere</label>
            <textarea
              className="mb-4 w-full rounded border border-gray-300 p-2"
              rows={3}
              value={form.description}
              onChange={(event) => onChange('description', event.target.value)}
              required
            />

            <label className="mb-2 block text-sm font-semibold">Sarcina initiala</label>
            <textarea
              className="mb-4 w-full rounded border border-gray-300 p-2"
              rows={4}
              value={form.taskPrompt}
              onChange={(event) => onChange('taskPrompt', event.target.value)}
              required
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold">Cost tokenuri</label>
                <input
                  type="number"
                  min="0"
                  className="mb-4 w-full rounded border border-gray-300 p-2"
                  value={form.tokenCost}
                  onChange={(event) => onChange('tokenCost', event.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Cost abonamente</label>
                <input
                  type="number"
                  min="0"
                  className="mb-4 w-full rounded border border-gray-300 p-2"
                  value={form.subscriptionCost}
                  onChange={(event) => onChange('subscriptionCost', event.target.value)}
                  required
                />
              </div>
            </div>

            <label className="mb-2 block text-sm font-semibold">Tip executie</label>
            <select
              className="mb-4 w-full rounded border border-gray-300 p-2"
              value={form.executionType}
              onChange={(event) => onChange('executionType', event.target.value)}
            >
              <option value="AI">AI</option>
              <option value="VPS_PLACEHOLDER">VPS placeholder</option>
            </select>

            {form.executionType === 'AI' && (
              <>
                <label className="mb-2 block text-sm font-semibold">Resursa AI ceruta</label>
                <select
                  className="mb-4 w-full rounded border border-gray-300 p-2"
                  value={form.aiResourceType}
                  onChange={(event) => onChange('aiResourceType', event.target.value)}
                >
                  <option value="text">Text</option>
                  <option value="code">Code</option>
                  <option value="image">Image</option>
                </select>
              </>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Se salveaza...' : 'Salveaza activitatea'}
            </button>
          </form>

          <div className="rounded border border-gray-200 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Lista activitati</h2>
              <span className="rounded bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800">
                Total: {activities.length}
              </span>
            </div>

            {loading ? (
              <p className="text-gray-500">Se incarca activitatile...</p>
            ) : (
              <div className="grid gap-3">
                {activities.map((activity) => (
                  <div key={activity._id} className="rounded border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-bold text-gray-900">{activity.title}</h3>
                      <div className="flex flex-wrap gap-2 text-xs font-bold">
                        <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-800">
                          {activity.tokenCost || 0} tokenuri
                        </span>
                        <span className="rounded bg-indigo-100 px-2 py-1 text-indigo-800">
                          {activity.subscriptionCost || 0} abonamente
                        </span>
                        <span className="rounded bg-slate-200 px-2 py-1 text-slate-800">
                          {activity.executionType === 'VPS_PLACEHOLDER' ? 'VPS placeholder' : 'AI'}
                        </span>
                        {activity.executionType === 'AI' && (
                          <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-800">
                            {activity.aiResourceType || 'text'}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mb-2 text-sm text-gray-700">{activity.description}</p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Sarcina:</span> {activity.taskPrompt}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
