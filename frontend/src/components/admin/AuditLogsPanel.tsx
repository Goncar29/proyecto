import { useEffect, useState } from 'react';
import { api } from '@/api/client';

interface AuditLog {
  id: number;
  userId: number;
  action: string;
  timestamp: string;
  metadata?: Record<string, unknown> | null;
  user: { id: number; name: string; email: string; role: string };
}

export default function AuditLogsPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const PAGE_SIZE = 30;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: String(PAGE_SIZE) };
    if (actionFilter) params.action = actionFilter;
    api.get<{ items: AuditLog[]; total: number; page: number; pageSize: number }>('/admin/audit', params)
      .then(data => { setLogs(data.items); setTotal(data.total); })
      .finally(() => setLoading(false));
  }, [page, actionFilter]);

  const roleColor: Record<string, string> = {
    PATIENT: 'text-gray-600 dark:text-gray-400',
    DOCTOR: 'text-blue-600 dark:text-blue-400',
    ADMIN: 'text-purple-600 dark:text-purple-400',
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Auditoría</h2>

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Filtrar por acción..."
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm flex-1 max-w-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Cargando logs...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No se encontraron registros.</p>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className={`font-medium ${roleColor[log.user.role] ?? 'text-gray-900 dark:text-white'}`}>
                    {log.user.name}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300 text-sm ml-3">{log.action}</span>
                </div>
                <span className="text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap ml-4">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 select-none">
                    Ver detalles
                  </summary>
                  <pre className="mt-1 text-xs bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded p-2 overflow-x-auto text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="text-sm border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Anterior
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Página {page} de {totalPages}
          {total > 0 && <span className="text-gray-400 dark:text-gray-500 ml-1">({total} total)</span>}
        </span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="text-sm border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
