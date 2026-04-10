import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import type { DoctorProfile, TimeBlock, Review } from '@/types';

interface DoctorDetailResponse extends Omit<DoctorProfile, 'user'> {
  user: { id: number; name: string; email: string; role: string };
  reviews: Review[];
  ratingHistogram?: Record<string, number>;
}

export default function DoctorDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<DoctorDetailResponse | null>(null);
  const [slots, setSlots] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<DoctorDetailResponse>(`/public/doctors/${id}`),
      api.get<TimeBlock[]>(`/public/doctors/${id}/availability`, {
        from: new Date().toISOString().split('T')[0],
        to: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      }),
    ])
      .then(([doc, avail]) => {
        setDoctor(doc);
        setSlots(avail);
      })
      .catch(() => setError('Doctor no encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBook = async (timeBlockId: number) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setError('');
    setSuccess('');
    setBooking(timeBlockId);
    try {
      await api.post(`/users/${user.id}/reservations`, {
        doctorId: Number(id),
        patientId: user.id,
        timeBlockId,
        reason: reason || undefined,
      });
      setSuccess('Turno reservado con éxito');
      setSlots(prev => prev.filter(s => s.id !== timeBlockId));
      setReason('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al reservar');
    } finally {
      setBooking(null);
    }
  };

  if (loading) return <p className="text-gray-500">Cargando...</p>;
  if (!doctor) return <p className="text-red-600">{error || 'Doctor no encontrado'}</p>;

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{doctor.user.name}</h1>
        <p className="text-blue-600 mt-1">{doctor.specialty}</p>
        {doctor.hospital && <p className="text-gray-600 text-sm">{doctor.hospital}</p>}
        {doctor.location && <p className="text-gray-500 text-sm">{doctor.location}</p>}
        {doctor.bio && <p className="text-gray-600 mt-3">{doctor.bio}</p>}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-yellow-500 text-lg">{'★'.repeat(Math.round(doctor.avgRating))}</span>
          <span className="text-gray-600">{doctor.avgRating.toFixed(1)} ({doctor.reviewCount} reviews)</span>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mb-4">Turnos disponibles</h2>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">{success}</div>}

      {user?.role === 'PATIENT' && (
        <input
          type="text"
          placeholder="Motivo de la consulta (opcional)"
          value={reason}
          onChange={e => setReason(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      )}

      {slots.length === 0 ? (
        <p className="text-gray-500">No hay turnos disponibles en los próximos 30 días.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map(slot => {
            const date = new Date(slot.date).toLocaleDateString();
            const start = new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const end = new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={slot.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{date}</p>
                  <p className="text-sm text-gray-500">{start} – {end}</p>
                </div>
                <button
                  onClick={() => handleBook(slot.id)}
                  disabled={booking === slot.id || !user || user.role !== 'PATIENT'}
                  className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {booking === slot.id ? 'Reservando...' : 'Reservar'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {doctor.reviews.length > 0 && (
        <>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Reviews</h2>
          <div className="space-y-3">
            {doctor.reviews.map(r => (
              <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-yellow-500">{'★'.repeat(r.rating)}</span>
                  <span className="text-sm text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                {r.text && <p className="text-gray-700">{r.text}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
