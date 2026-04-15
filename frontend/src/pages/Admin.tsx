import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useToast } from '@/context/ToastContext';
import TimeBlocksPanel from '@/components/admin/TimeBlocksPanel';
import AuditLogsPanel from '@/components/admin/AuditLogsPanel';
import type { AdminUser, PaginatedResponse } from '@/types';

type Tab = 'users' | 'timeblocks' | 'audit';

const PAGE_SIZE = 20;

export default function Admin() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [promoting, setPromoting] = useState<number | null>(null);
  const [specialty, setSpecialty] = useState('');
  const [showPromote, setShowPromote] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (tab !== 'users') return;
    setLoading(true);
    api.get<PaginatedResponse<AdminUser>>(`/admin/users?page=${page}&pageSize=${PAGE_SIZE}`)
      .then(res => {
        setUsers(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [tab, page]);

  const toggleStatus = async (userId: number, field: 'isActive' | 'isSuspended', current: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { [field]: !current });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: !current } : u));
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'No se pudo actualizar el estado del usuario.', 'error');
    }
  };

  const handlePromote = async (userId: number) => {
    if (!specialty.trim()) return;
    setPromoting(userId);
    try {
      await api.post(`/admin/users/${userId}/promote-to-doctor`, { specialty });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: 'DOCTOR' } : u));
      setShowPromote(null);
      setSpecialty('');
      toast('Usuario promovido a doctor', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'No se pudo promover el usuario a doctor.', 'error');
    } finally {
      setPromoting(null);
    }
  };

  const roleColor: Record<string, string> = {
    PATIENT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    DOCTOR: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'users', label: 'Usuarios' },
    { key: 'timeblocks', label: 'Bloques de tiempo' },
    { key: 'audit', label: 'Auditoría' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Panel de administración</h1>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {total} usuario{total !== 1 ? 's' : ''} en total
            </p>
          </div>
          {loading ? (
            <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
          ) : (
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{u.name} <span className="text-gray-500 dark:text-gray-400 text-sm">({u.email})</span></p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[u.role] ?? ''}`}>{u.role}</span>
                        {u.doctorProfile?.specialty && <span className="text-sm text-blue-600 dark:text-blue-400">{u.doctorProfile.specialty}</span>}
                        {!u.isActive && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Inactivo</span>}
                        {u.isSuspended && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Suspendido</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleStatus(u.id, 'isActive', u.isActive)}
                        className="text-xs border border-gray-300 dark:border-gray-600 px-3 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        {u.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => toggleStatus(u.id, 'isSuspended', u.isSuspended)}
                        className="text-xs border border-gray-300 dark:border-gray-600 px-3 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        {u.isSuspended ? 'Desuspender' : 'Suspender'}
                      </button>
                      {u.role === 'PATIENT' && (
                        <button
                          onClick={() => setShowPromote(showPromote === u.id ? null : u.id)}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                        >
                          Promover a Doctor
                        </button>
                      )}
                    </div>
                  </div>
                  {showPromote === u.id && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Especialidad"
                        value={specialty}
                        onChange={e => setSpecialty(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        onClick={() => handlePromote(u.id)}
                        disabled={promoting === u.id}
                        className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                      >
                        {promoting === u.id ? 'Promoviendo...' : 'Confirmar'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1 || loading}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                ← Anterior
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages || loading}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'timeblocks' && <TimeBlocksPanel />}
      {tab === 'audit' && <AuditLogsPanel />}
    </div>
  );
}
