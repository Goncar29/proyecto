import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/api/client';
import { ListSkeleton } from '@/components/Skeleton';
import ReviewForm from '@/components/ReviewForm';
import DoctorAvatar from '@/components/DoctorAvatar';
import ReschedulePicker from '@/components/ReschedulePicker';
import ConfirmModal from '@/components/ConfirmModal';
import type { Appointment, PaginatedResponse } from '@/types';

const PAGE_SIZE = 10;

interface DoctorProfile {
  specialty: string;
  hospital: string | null;
  location: string | null;
  bio: string | null;
  photoUrl: string | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<DoctorProfile>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isDoctor = user?.role === 'DOCTOR';

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const now = new Date().toISOString();
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (tab === 'upcoming') params.set('from', now);
    else params.set('to', now);
    if (statusFilter) params.set('status', statusFilter);
    api.get<PaginatedResponse<Appointment>>(`/users/${user.id}/appointments?${params}`)
      .then(res => {
        setAppointments(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [user, page, statusFilter, tab]);

  useEffect(() => {
    if (!user || user.role !== 'DOCTOR') return;
    api.get<DoctorProfile>(`/public/doctors/${user.id}`)
      .then(d => {
        setDoctorProfile(d);
        setProfileForm({ specialty: d.specialty, hospital: d.hospital ?? '', location: d.location ?? '', bio: d.bio ?? '', photoUrl: d.photoUrl ?? '' });
      })
      .catch(() => {}); // perfil puede no existir aún si fue recién promovido
  }, [user]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await api.patch<DoctorProfile>('/doctors/me/profile', profileForm);
      setDoctorProfile(updated);
      setEditingProfile(false);
      toast('Perfil actualizado', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error al guardar el perfil', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

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
    PENDING:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    CONFIRMED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const statusLabel: Record<string, string> = {
    PENDING: 'Pendiente', CONFIRMED: 'Confirmada', CANCELLED: 'Cancelada', COMPLETED: 'Completada',
  };

  const isPastAppointment = (a: Appointment) =>
    a.timeBlock ? new Date(a.timeBlock.endTime) < new Date() : false;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
        {isDoctor ? 'Mi agenda' : 'Dashboard'}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {isDoctor
          ? `Dr. ${user?.name} — gestioná tus citas`
          : `Bienvenido, ${user?.name}`}
      </p>

      {/* Sección Mi perfil — solo para doctores */}
      {isDoctor && doctorProfile && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mi perfil</h2>
            <button
              onClick={() => setEditingProfile(e => !e)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {editingProfile ? 'Cancelar' : 'Editar'}
            </button>
          </div>

          {editingProfile ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Foto (URL)</label>
                <input
                  type="url"
                  placeholder="https://ejemplo.com/foto.jpg"
                  value={profileForm.photoUrl ?? ''}
                  onChange={e => setProfileForm(f => ({ ...f, photoUrl: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Especialidad</label>
                <input
                  type="text"
                  value={profileForm.specialty ?? ''}
                  onChange={e => setProfileForm(f => ({ ...f, specialty: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hospital</label>
                  <input
                    type="text"
                    value={profileForm.hospital ?? ''}
                    onChange={e => setProfileForm(f => ({ ...f, hospital: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ubicación</label>
                  <input
                    type="text"
                    value={profileForm.location ?? ''}
                    onChange={e => setProfileForm(f => ({ ...f, location: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Biografía</label>
                <textarea
                  rows={3}
                  value={profileForm.bio ?? ''}
                  onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {savingProfile ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <DoctorAvatar name={user?.name ?? ''} photoUrl={doctorProfile.photoUrl} size="lg" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-gray-900 dark:text-white">{doctorProfile.specialty}</p>
                {doctorProfile.hospital && <p className="text-gray-500 dark:text-gray-400">{doctorProfile.hospital}</p>}
                {doctorProfile.location && <p className="text-gray-500 dark:text-gray-400">{doctorProfile.location}</p>}
                {doctorProfile.bio && <p className="text-gray-600 dark:text-gray-300 mt-2">{doctorProfile.bio}</p>}
                {!doctorProfile.photoUrl && (
                  <p className="text-orange-500 dark:text-orange-400 text-xs mt-1">
                    Sin foto de perfil — agregá una URL en "Editar"
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs Próximos / Historial */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {(['upcoming', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); setStatusFilter(''); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t === 'upcoming' ? '📅 Próximas' : '🕐 Historial'}
          </button>
        ))}
      </div>

      {/* Filters + count row */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {total > 0 ? `${total} cita${total !== 1 ? 's' : ''}` : ''}
        </span>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          {tab === 'upcoming' ? (
            <>
              <option value="PENDING">Pendiente</option>
              <option value="CONFIRMED">Confirmada</option>
            </>
          ) : (
            <>
              <option value="COMPLETED">Completada</option>
              <option value="CANCELLED">Cancelada</option>
            </>
          )}
        </select>
      </div>

      {loading ? (
        <ListSkeleton count={4} />
      ) : appointments.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          {statusFilter
            ? 'No hay citas con ese estado.'
            : tab === 'upcoming'
              ? 'No tenés citas próximas.'
              : 'No tenés citas en el historial.'}
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {appointments.map(a => (
              <div key={a.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Cita #{a.id}
                      {a.timeBlock && (
                        <span className="text-gray-500 dark:text-gray-400 font-normal ml-2">
                          {new Date(a.timeBlock.date).toLocaleDateString('es-AR')}
                          {' — '}
                          {new Date(a.timeBlock.startTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {new Date(a.timeBlock.endTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </p>

                    {/* Participant info — show the other party */}
                    {isDoctor && a.patient && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Paciente:{' '}
                        <span className="font-medium text-gray-700 dark:text-gray-300">{a.patient.name}</span>
                      </p>
                    )}
                    {!isDoctor && a.doctor && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Doctor:{' '}
                        <span className="font-medium text-gray-700 dark:text-gray-300">{a.doctor.name}</span>
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[a.status] ?? ''}`}>
                        {statusLabel[a.status] ?? a.status}
                      </span>
                      {a.status === 'CONFIRMED' && isPastAppointment(a) && isDoctor && (
                        <span className="text-xs text-orange-500 dark:text-orange-400 font-medium">
                          Horario pasado — marcá como completada
                        </span>
                      )}
                      {a.notes && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                          Nota: {a.notes}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Review — patient, completed, not yet reviewed */}
                    {a.status === 'COMPLETED' && !isDoctor && !reviewed.has(a.id) && (
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
                    {a.status === 'PENDING' && isDoctor && (
                      <button
                        onClick={() => handleConfirm(a.id)}
                        className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 border border-green-200 dark:border-green-700 px-3 py-1 rounded-lg"
                      >
                        Confirmar
                      </button>
                    )}
                    {a.status === 'CONFIRMED' && isDoctor && (
                      <button
                        onClick={() => handleComplete(a.id)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 border border-blue-200 dark:border-blue-700 px-3 py-1 rounded-lg"
                      >
                        Completar
                      </button>
                    )}

                    {/* Reschedule — patient only, PENDING or CONFIRMED */}
                    {(a.status === 'PENDING' || a.status === 'CONFIRMED') && !isDoctor && (
                      <button
                        onClick={() => setReschedulingAppt(a)}
                        className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 border border-purple-200 dark:border-purple-700 px-3 py-1 rounded-lg"
                      >
                        Reprogramar
                      </button>
                    )}

                    {/* Cancel — both roles, while not terminal */}
                    {(a.status === 'PENDING' || a.status === 'CONFIRMED') && (
                      <button
                        onClick={() => setCancellingId(a.id)}
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

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                ← Anterior
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
      {/* Cancel confirmation modal */}
      {cancellingId !== null && (
        <ConfirmModal
          title="Cancelar cita"
          message="¿Estás seguro de que querés cancelar esta cita? Esta acción no se puede deshacer."
          confirmLabel="Sí, cancelar"
          cancelLabel="Volver"
          variant="danger"
          onConfirm={() => {
            handleCancel(cancellingId);
            setCancellingId(null);
          }}
          onCancel={() => setCancellingId(null)}
        />
      )}

      {/* Reschedule modal */}
      {reschedulingAppt && user && (
        <ReschedulePicker
          appointment={reschedulingAppt}
          userId={user.id}
          onClose={() => setReschedulingAppt(null)}
          onRescheduled={(updated) => {
            setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
            setReschedulingAppt(null);
          }}
        />
      )}
    </div>
  );
}
