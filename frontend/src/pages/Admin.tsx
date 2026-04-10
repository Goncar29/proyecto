import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import type { User } from '@/types';

export default function Admin() {
  const [users, setUsers] = useState<(User & { isActive: boolean; isSuspended: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<number | null>(null);
  const [specialty, setSpecialty] = useState('');
  const [showPromote, setShowPromote] = useState<number | null>(null);

  useEffect(() => {
    api.get<(User & { isActive: boolean; isSuspended: boolean })[]>('/admin/users')
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (userId: number, field: 'isActive' | 'isSuspended', current: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { [field]: !current });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: !current } : u));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error');
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
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al promover');
    } finally {
      setPromoting(null);
    }
  };

  const roleColor: Record<string, string> = {
    PATIENT: 'bg-gray-100 text-gray-800',
    DOCTOR: 'bg-blue-100 text-blue-800',
    ADMIN: 'bg-purple-100 text-purple-800',
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Panel de administración</h1>

      <h2 className="text-xl font-semibold text-gray-900 mb-4">Usuarios</h2>
      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-medium text-gray-900">{u.name} <span className="text-gray-500 text-sm">({u.email})</span></p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[u.role] ?? ''}`}>{u.role}</span>
                    {!u.isActive && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactivo</span>}
                    {u.isSuspended && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Suspendido</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleStatus(u.id, 'isActive', u.isActive)}
                    className="text-xs border border-gray-300 px-3 py-1 rounded-lg hover:bg-gray-50"
                  >
                    {u.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => toggleStatus(u.id, 'isSuspended', u.isSuspended)}
                    className="text-xs border border-gray-300 px-3 py-1 rounded-lg hover:bg-gray-50"
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
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm flex-1 focus:ring-2 focus:ring-blue-500 outline-none"
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
    </div>
  );
}
