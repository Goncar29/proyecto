import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DetailSkeleton } from '@/components/Skeleton';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';

interface DoctorDetail {
  id: number;
  name: string;
  specialty: string;
  specialties?: string[];
  hospital?: string;
  location?: string;
  bio?: string;
  photoUrl?: string;
  avgRating: number;
  reviewCount: number;
  ratingHistogram?: Record<string, number>;
}

interface Slot {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
}

interface ReviewItem {
  id: number;
  rating: number;
  text: string;
  createdAt: string;
  patient: { id: number; name: string };
}

interface PaginatedReviews {
  items: ReviewItem[];
  total: number;
  page: number;
  pageSize: number;
}

export default function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<DoctorDetail>(`/public/doctors/${id}`),
      api.get<Slot[]>(`/public/doctors/${id}/availability`, {
        from: new Date().toISOString().split('T')[0],
        to: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      }),
      api.get<PaginatedReviews>(`/public/doctors/${id}/reviews`),
    ])
      .then(([doc, avail, rev]) => {
        setDoctor(doc);
        setSlots(avail);
        setReviews(rev.items);
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
    setBooking(timeBlockId);
    try {
      await api.post(`/users/${user.id}/reservations`, {
        doctorId: Number(id),
        patientId: user.id,
        timeBlockId,
        reason: reason || undefined,
      });
      toast('Turno reservado con éxito', 'success');
      navigate('/dashboard');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error al reservar', 'error');
    } finally {
      setBooking(null);
    }
  };

  if (loading) return <DetailSkeleton />;
  if (!doctor) return <p className="text-red-600">{error || 'Doctor no encontrado'}</p>;

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{doctor.name}</h1>
        <p className="text-blue-600 dark:text-blue-400 mt-1">{doctor.specialty}</p>
        {doctor.hospital && <p className="text-gray-600 dark:text-gray-400 text-sm">{doctor.hospital}</p>}
        {doctor.location && <p className="text-gray-500 dark:text-gray-400 text-sm">{doctor.location}</p>}
        {doctor.bio && <p className="text-gray-600 dark:text-gray-300 mt-3">{doctor.bio}</p>}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-yellow-500 text-lg">{'★'.repeat(Math.round(doctor.avgRating))}</span>
          <span className="text-gray-600 dark:text-gray-400">{doctor.avgRating.toFixed(1)} ({doctor.reviewCount} reviews)</span>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Turnos disponibles</h2>
      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">{error}</div>}

      {user?.role === 'PATIENT' && (
        <input
          type="text"
          placeholder="Motivo de la consulta (opcional)"
          value={reason}
          onChange={e => setReason(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      )}

      <AvailabilityCalendar
        slots={slots}
        booking={booking}
        isPatient={!!user && user.role === 'PATIENT'}
        onBook={handleBook}
      />

      {reviews.length > 0 && (
        <>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">Reviews</h2>
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">{'★'.repeat(r.rating)}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{r.patient.name}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                {r.text && <p className="text-gray-700 dark:text-gray-300">{r.text}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
