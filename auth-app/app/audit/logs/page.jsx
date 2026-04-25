'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const session = await getSession();
      if (!session || (session.user.role !== 'Audit' && session.user.role !== 'Admin')) {
        router.push('/dashboard');
        return;
      }

      const res = await fetch('/api/audit/logs');
      const payload = await res.json();

      if (res.ok) {
        setLogs(payload);
      } else {
        setMessage(payload.message || 'Nu am putut incarca jurnalul.');
      }

      setLoading(false);
    }

    init();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100 p-8 text-black">
      <div className="mx-auto max-w-7xl rounded bg-white p-8 shadow-md">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Jurnal audit</h1>
            <p className="text-sm text-gray-600">Vizibil pentru utilizatorii cu rolul Audit si pentru administratori.</p>
          </div>
          <Link href="/dashboard" className="text-blue-600 hover:underline font-semibold">
            Inapoi la Dashboard
          </Link>
        </div>

        {message && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 font-semibold text-red-800">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Se incarca jurnalul...</p>
        ) : logs.length === 0 ? (
          <p className="text-gray-500">Nu exista inca intrari in jurnal.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 pr-4">Moment</th>
                  <th className="py-2 pr-4">Actor</th>
                  <th className="py-2 pr-4">Actiune</th>
                  <th className="py-2 pr-4">Tinta</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Detalii</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="border-b border-gray-100 align-top">
                    <td className="py-2 pr-4 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('ro-RO')}</td>
                    <td className="py-2 pr-4">
                      <div className="font-semibold">{log.actorEmail || 'Anonim / sistem'}</div>
                      <div className="text-xs text-gray-500">{log.actorRole || '-'}</div>
                    </td>
                    <td className="py-2 pr-4 font-semibold">{log.action}</td>
                    <td className="py-2 pr-4">
                      <div>{log.targetType || '-'}</div>
                      <div className="text-xs text-gray-500">{log.targetLabel || log.targetId || '-'}</div>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`rounded px-2 py-1 text-xs font-bold ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2">{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
