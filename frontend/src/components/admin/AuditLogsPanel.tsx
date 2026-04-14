import { useEffect, useState } from 'react';
import { api } from '@/api/client';

interface AuditLog {
  id: number;
  userId: number;
  action: string;
  timestamp: string;
  user: { id: number; name: string; email: string; role: string };
}

export default function AuditLogsPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: '30' };
    if (actionFilter) params.action = actionFilter;
    api.get<AuditLog[]>('/admin/audit', params)
      .then(setLogs)
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
            <div key={log.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center justify-between">
              <div>
                <span className={`font-medium ${roleColor[log.user.role] ?? 'text-gray-900 dark:text-white'}`}>
                  {log.user.name}
                </span>
                <span className="text-gray-700 dark:text-gray-300 text-sm ml-3">{log.action}</span>
              </div>
              <span className="text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="text-sm border border-gray-300 dark:border-gray-600 px-3 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400">Página {page}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={logs.length < 30}
          className="text-sm border border-gray-300 dark:border-gray-600 px-3 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
