import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useToast } from '@/context/ToastContext';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import type { Appointment } from '@/types';

interface Slot {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
}

interface Props {
  appointment: Appointment;
  userId: number;
  onClose: () => void;
  onRescheduled: (updated: Appointment) => void;
}

export default function ReschedulePicker({ appointment, userId, onClose, onRescheduled }: Props) {
  const { toast } = useToast();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<number | null>(null);

  useEffect(() => {
    const from = new Date().toISOString();
    const to   = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 días
    api.get<Slot[]>(`/public/doctors/${appointment.doctorId}/availability?from=${from}&to=${to}`)
      .then(setSlots)
      .catch(() => toast('No se pudieron cargar los turnos disponibles', 'error'))
      .finally(() => setLoading(false));
  }, [appointment.doctorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBook = async (slotId: number) => {
    setBooking(slotId);
    try {
      const updated = await api.patch<Appointment>(
        `/users/${userId}/appointments/${appointment.id}/reschedule`,
        { timeBlockId: slotId }
      );
      toast('Turno reprogramado correctamente', 'success');
      onRescheduled(updated);
      onClose();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error al reprogramar', 'error');
    } finally {
      setBooking(null);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-16 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Reprogramar cita #{appointment.id}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Seleccioná un nuevo horario con el Dr. {appointment.doctor?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <AvailabilityCalendar
              slots={slots}
              booking={booking}
              isPatient={true}
              onBook={handleBook}
            />
          )}
        </div>
      </div>
    </div>
  );
}
