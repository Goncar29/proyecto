import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/api/client';
import ReviewForm from '@/components/ReviewForm';
import type { Appointment, PaginatedResponse } from '@/types';

export default function Dashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) return;
    api.get<PaginatedResponse<Appointment>>(`/users/${user.id}/appointments`)
      .then(res => setAppointments(res.items))
      .finally(() => setLoading(false));
  }, [user]);

  const handleCancel = async (id: number) => {
    try {
      await api.patch(`/appointments/${id}/cancel`);
      setAppointments(prev =>
        prev.map(a => a.id === id ? { ...a, status: 'CANCELLED' as const } : a)
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al cancelar');
    }
  };

  const statusColor: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-6">Bienvenido, {user?.name} ({user?.role})</p>

      <h2 className="text-xl font-semibold text-gray-900 mb-4">Mis citas</h2>
      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : appointments.length === 0 ? (
        <p className="text-gray-500">No tenés citas registradas.</p>
      ) : (
        <div className="space-y-3">
          {appointments.map(a => (
            <div key={a.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    Cita #{a.id}
                    {a.timeBlock && (
                      <span className="text-gray-500 font-normal ml-2">
                        {new Date(a.timeBlock.date).toLocaleDateString()} — {new Date(a.timeBlock.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[a.status] ?? ''}`}>
                    {a.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {a.status === 'COMPLETED' && user?.role === 'PATIENT' && !reviewed.has(a.id) && (
                    <button
                      onClick={() => setReviewingId(reviewingId === a.id ? null : a.id)}
                      className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1 rounded-lg"
                    >
                      {reviewingId === a.id ? 'Cerrar' : 'Dejar review'}
                    </button>
                  )}
                  {reviewed.has(a.id) && (
                    <span className="text-sm text-green-600">Review enviada</span>
                  )}
                  {(a.status === 'PENDING' || a.status === 'CONFIRMED') && (
                    <button
                      onClick={() => handleCancel(a.id)}
                      className="text-sm text-red-600 hover:text-red-800 border border-red-200 px-3 py-1 rounded-lg"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
              {reviewingId === a.id && (
                <ReviewForm
                  doctorId={a.doctorId}
                  appointmentId={a.id}
                  onSuccess={() => {
                    setReviewingId(null);
                    setReviewed(prev => new Set(prev).add(a.id));
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
