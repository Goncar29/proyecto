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

const statusBorder: Record<string, string> = {
  PENDING:   'border-l-[var(--color-warning)]',
  CONFIRMED: 'border-l-[var(--color-success)]',
  CANCELLED: 'border-l-[var(--color-danger)]',
  COMPLETED: 'border-l-[var(--color-primary)]',
};

const statusLabel: Record<string, string> = {
  PENDING: 'Pendiente', CONFIRMED: 'Confirmada', CANCELLED: 'Cancelada', COMPLETED: 'Completada',
};

const statusBadge: Record<string, string> = {
  PENDING:   'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  CONFIRMED: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  CANCELLED: 'bg-[var(--color-danger-light)] text-[var(--color-danger)]',
  COMPLETED: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
};

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
    if (tab === 'upcoming') {
      params.set('from', now);
      if (statusFilter) params.set('status', statusFilter);
    } else {
      params.set('status', statusFilter || 'CANCELLED,COMPLETED');
    }
    api.get<PaginatedResponse<Appointment>>(`/users/${user.id}/appointments?${params}`)
      .then(res => { setAppointments(res.items); setTotal(res.total); })
      .finally(() => setLoading(false));
  }, [user, page, statusFilter, tab]);

  useEffect(() => {
    if (!user || user.role !== 'DOCTOR') return;
    api.get<DoctorProfile>(`/public/doctors/${user.id}`)
      .then(d => {
        setDoctorProfile(d);
        setProfileForm({ specialty: d.specialty, hospital: d.hospital ?? '', location: d.location ?? '', bio: d.bio ?? '', photoUrl: d.photoUrl ?? '' });
      })
      .catch(() => {});
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

  const isPastAppointment = (a: Appointment) =>
    a.timeBlock ? new Date(a.timeBlock.endTime) < new Date() : false;

  const inputClass = 'w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)] outline-none';

  return (
    <div>
      <h1
        className="text-3xl font-bold text-[var(--color-text)] mb-1"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {isDoctor ? 'Mi agenda' : 'Mis turnos'}
      </h1>
      <p className="text-[var(--color-text-secondary)] mb-6">
        {isDoctor ? `Dr. ${user?.name} — gestioná tus citas` : `Bienvenido, ${user?.name}`}
      </p>

      {/* Doctor profile section */}
      {isDoctor && doctorProfile && (
        <div
          className="rounded-[var(--radius-xl)] bg-[var(--color-card)] p-5 mb-6"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Mi perfil</h2>
            <button
              onClick={() => setEditingProfile(e => !e)}
              className="text-sm font-medium text-[var(--color-primary)] hover:underline underline-offset-4"
            >
              {editingProfile ? 'Cancelar' : 'Editar'}
            </button>
          </div>

          {editingProfile ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Foto (URL)</label>
                <input type="url" placeholder="https://ejemplo.com/foto.jpg" value={profileForm.photoUrl ?? ''} onChange={e => setProfileForm(f => ({ ...f, photoUrl: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Especialidad</label>
                <input type="text" value={profileForm.specialty ?? ''} onChange={e => setProfileForm(f => ({ ...f, specialty: e.target.value }))} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Hospital</label>
                  <input type="text" value={profileForm.hospital ?? ''} onChange={e => setProfileForm(f => ({ ...f, hospital: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Ubicación</label>
                  <input type="text" value={profileForm.location ?? ''} onChange={e => setProfileForm(f => ({ ...f, location: e.target.value }))} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Biografía</label>
                <textarea rows={3} value={profileForm.bio ?? ''} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))} className={`${inputClass} resize-none`} />
              </div>
              <button onClick={handleSaveProfile} disabled={savingProfile} className="px-4 py-2 rounded-[var(--radius-md)] text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors">
                {savingProfile ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <DoctorAvatar name={user?.name ?? ''} photoUrl={doctorProfile.photoUrl} size="lg" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-[var(--color-text)]">{doctorProfile.specialty}</p>
                {doctorProfile.hospital && <p className="text-[var(--color-text-muted)]">{doctorProfile.hospital}</p>}
                {doctorProfile.location && <p className="text-[var(--color-text-muted)]">{doctorProfile.location}</p>}
                {doctorProfile.bio && <p className="text-[var(--color-text-secondary)] mt-2">{doctorProfile.bio}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-[var(--color-border)]">
        {(['upcoming', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); setStatusFilter(''); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            {t === 'upcoming' ? 'Próximas' : 'Historial'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <span className="text-sm text-[var(--color-text-muted)]">
          {total > 0 ? `${total} cita${total !== 1 ? 's' : ''}` : ''}
        </span>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          aria-label="Filtrar por estado"
          className="text-sm rounded-[var(--radius-md)] px-3 py-1.5 border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
        <p className="text-[var(--color-text-muted)] py-8 text-center">
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
              <div
                key={a.id}
                className={`rounded-[var(--radius-lg)] bg-[var(--color-card)] p-4 border-l-[3px] ${statusBorder[a.status] ?? 'border-l-gray-300'}`}
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium text-[var(--color-text)]">
                      Cita #{a.id}
                      {a.timeBlock && (
                        <span className="text-[var(--color-text-muted)] font-normal ml-2 text-sm">
                          {new Date(a.timeBlock.date).toLocaleDateString('es-AR')}
                          {' — '}
                          {new Date(a.timeBlock.startTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {new Date(a.timeBlock.endTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </p>

                    {isDoctor && a.patient && (
                      <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                        Paciente: <span className="font-medium text-[var(--color-text-secondary)]">{a.patient.name}</span>
                      </p>
                    )}
                    {!isDoctor && a.doctor && (
                      <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                        Doctor: <span className="font-medium text-[var(--color-text-secondary)]">{a.doctor.name}</span>
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[a.status] ?? ''}`}>
                        {statusLabel[a.status] ?? a.status}
                      </span>
                      {a.status === 'CONFIRMED' && isPastAppointment(a) && isDoctor && (
                        <span className="text-xs text-[var(--color-warning)] font-medium">
                          Horario pasado — marcá como completada
                        </span>
                      )}
                      {a.notes && (
                        <span className="text-xs text-[var(--color-text-muted)] italic">
                          Nota: {a.notes}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {a.status === 'COMPLETED' && !isDoctor && !reviewed.has(a.id) && (
                      <ActionBtn onClick={() => setReviewingId(reviewingId === a.id ? null : a.id)} variant="primary">
                        {reviewingId === a.id ? 'Cerrar' : 'Dejar review'}
                      </ActionBtn>
                    )}
                    {reviewed.has(a.id) && (
                      <span className="text-sm text-[var(--color-success)]">Review enviada</span>
                    )}

                    {a.status === 'PENDING' && isDoctor && (
                      <ActionBtn onClick={() => handleConfirm(a.id)} variant="success">Confirmar</ActionBtn>
                    )}
                    {a.status === 'CONFIRMED' && isDoctor && (
                      <ActionBtn onClick={() => handleComplete(a.id)} variant="primary">Completar</ActionBtn>
                    )}

                    {(a.status === 'PENDING' || a.status === 'CONFIRMED') && !isDoctor && (
                      <ActionBtn onClick={() => setReschedulingAppt(a)} variant="secondary">Reprogramar</ActionBtn>
                    )}

                    {(a.status === 'PENDING' || a.status === 'CONFIRMED') && (
                      <ActionBtn onClick={() => setCancellingId(a.id)} variant="danger">Cancelar</ActionBtn>
                    )}
                  </div>
                </div>

                {reviewingId === a.id && (
                  <ReviewForm
                    doctorId={a.doctorId}
                    appointmentId={a.id}
                    onSuccess={() => { setReviewingId(null); setReviewed(prev => new Set(prev).add(a.id)); }}
                  />
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="px-4 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-card-hover)] text-[var(--color-text-secondary)] transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-sm text-[var(--color-text-muted)]">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-card-hover)] text-[var(--color-text-secondary)] transition-colors"
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
          onConfirm={() => { handleCancel(cancellingId); setCancellingId(null); }}
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

function ActionBtn({ children, onClick, variant }: { children: React.ReactNode; onClick: () => void; variant: 'primary' | 'success' | 'danger' | 'secondary' }) {
  const colors = {
    primary: 'text-[var(--color-primary)] border-[var(--color-primary)]/30 hover:bg-[var(--color-primary-light)]',
    success: 'text-[var(--color-success)] border-[var(--color-success)]/30 hover:bg-[var(--color-success-light)]',
    danger: 'text-[var(--color-danger)] border-[var(--color-danger)]/30 hover:bg-[var(--color-danger-light)]',
    secondary: 'text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-card-hover)]',
  };
  return (
    <button
      onClick={onClick}
      className={`text-sm font-medium border px-3 py-1 rounded-[var(--radius-md)] transition-colors ${colors[variant]}`}
    >
      {children}
    </button>
  );
}
