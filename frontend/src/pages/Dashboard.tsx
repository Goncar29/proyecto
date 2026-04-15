import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/api/client';
import { ListSkeleton } from '@/components/Skeleton';
import ReviewForm from '@/components/ReviewForm';
import type { Appointment, PaginatedResponse } from '@/types';

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
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

  const updateLocalStatus = (id: number, status: Appointment['status']) =>
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));

  const handleCancel = async (id: number) => {
    try {
      await api.patch(`/appointments/${id}/cancel`);
      updateLocalStatus(id, 'CANCELLED');
      toast('Cita cancelada', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error al cancelar', 'error');
    }
  };

  const handleConfirm = async (id: number) => {
    try {
      await api.patch(`/appointments/${id}/confirm`);
      updateLocalStatus(id, 'CONFIRMED');
      toast('Cita confirmada', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error al confirmar', 'error');
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await api.patch(`/appointments/${id}/complete`);
      updateLocalStatus(id, 'COMPLETED');
      toast('Cita completada', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error al completar', 'error');
    }
  };

  const statusColor: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    CONFIRMED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const isPastAppointment = (a: Appointment) =>
    a.timeBlock ? new Date(a.timeBlock.endTime) < new Date() : false;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Bienvenido, {user?.name} ({user?.role})</p>

      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Mis citas</h2>
      {loading ? (
        <ListSkeleton count={4} />
      ) : appointments.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No tenés citas registradas.</p>
      ) : (
        <div className="space-y-3">
          {appointments.map(a => (
            <div key={a.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Cita #{a.id}
                    {a.timeBlock && (
                      <span className="text-gray-500 dark:text-gray-400 font-normal ml-2">
                        {new Date(a.timeBlock.date + 'T00:00:00').toLocaleDateString()} — {new Date(a.timeBlock.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </p>
                  {/* Participant info — show the other party */}
                  {user?.role === 'DOCTOR' && a.patient && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Paciente: <span className="font-medium text-gray-700 dark:text-gray-300">{a.patient.name}</span>
                    </p>
                  )}
                  {user?.role === 'PATIENT' && a.doctor && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Doctor: <span className="font-medium text-gray-700 dark:text-gray-300">{a.doctor.name}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[a.status] ?? ''}`}>
                      {a.status}
                    </span>
                    {/* Lazy nudge: confirmed appointment whose time has already passed */}
                    {a.status === 'CONFIRMED' && isPastAppointment(a) && user?.role === 'DOCTOR' && (
                      <span className="text-xs text-orange-500 dark:text-orange-400 font-medium">
                        Horario pasado — marcá como completada
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Review button — patient, completed appointment, not yet reviewed */}
                  {a.status === 'COMPLETED' && user?.role === 'PATIENT' && !reviewed.has(a.id) && (
                    <button
                      onClick={() => setReviewingId(reviewingId === a.id ? null : a.id)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 border border-blue-200 dark:border-blue-700 px-3 py-1 rounded-lg"
                    >
                      {reviewingId === a.id ? 'Cerrar' : 'Dejar review'}
                    </button>
                  )}
                  {reviewed.has(a.id) && (
                    <span className="text-sm text-green-600 dark:text-green-400">Review enviada</span>
                  )}

                  {/* Doctor actions */}
                  {a.status === 'PENDING' && user?.role === 'DOCTOR' && (
                    <button
                      onClick={() => handleConfirm(a.id)}
                      className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 border border-green-200 dark:border-green-700 px-3 py-1 rounded-lg"
                    >
                      Confirmar
                    </button>
                  )}
                  {a.status === 'CONFIRMED' && user?.role === 'DOCTOR' && (
                    <button
                      onClick={() => handleComplete(a.id)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 border border-blue-200 dark:border-blue-700 px-3 py-1 rounded-lg"
                    >
                      Completar
                    </button>
                  )}

                  {/* Cancel — available to both roles while not terminal */}
                  {(a.status === 'PENDING' || a.status === 'CONFIRMED') && (
                    <button
                      onClick={() => handleCancel(a.id)}
                      className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 border border-red-200 dark:border-red-700 px-3 py-1 rounded-lg"
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
