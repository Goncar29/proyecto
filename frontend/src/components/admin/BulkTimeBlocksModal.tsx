import { useState } from 'react';
import { api } from '@/api/client';
import { useToast } from '@/context/ToastContext';

interface DoctorOption {
  id: number;
  name: string;
  specialty: string;
}

interface BulkResult {
  created: number;
  skipped: number;
  total: number;
}

interface Props {
  doctors: DoctorOption[];
  onClose: () => void;
  onSuccess: () => void;
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const SLOT_DURATIONS = [15, 20, 30, 45, 60, 90, 120];

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Calcula cuántos slots se van a generar (preview client-side) */
function previewSlots(
  startDate: string,
  endDate: string,
  daysOfWeek: number[],
  startHour: number,
  endHour: number,
  slotDurationMin: number,
): number {
  if (!startDate || !endDate || daysOfWeek.length === 0 || endHour <= startHour || slotDurationMin <= 0) return 0;
  const rangeMin = (endHour - startHour) * 60;
  if (rangeMin % slotDurationMin !== 0) return 0; // no divide exacto

  const now = new Date();
  const end = new Date(endDate + 'T00:00:00Z');
  const current = new Date(startDate + 'T00:00:00Z');
  const slotsPerDay = rangeMin / slotDurationMin;
  let count = 0;

  while (current <= end) {
    if (daysOfWeek.includes(current.getUTCDay())) {
      for (let offset = 0; offset < rangeMin; offset += slotDurationMin) {
        const slotStart = new Date(current);
        slotStart.setUTCHours(startHour, offset, 0, 0);
        if (slotStart > now) count++;
      }
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return count;
}

export default function BulkTimeBlocksModal({ doctors, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [doctorId, setDoctorId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]); // Lun–Vie
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(17);
  const [slotDurationMin, setSlotDurationMin] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const rangeMin = (endHour - startHour) * 60;
  const divides = rangeMin > 0 && rangeMin % slotDurationMin === 0;
  const preview = previewSlots(startDate, endDate, daysOfWeek, startHour, endHour, slotDurationMin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) { toast('Seleccioná un doctor', 'error'); return; }
    if (!startDate || !endDate) { toast('Completá las fechas', 'error'); return; }
    if (daysOfWeek.length === 0) { toast('Seleccioná al menos un día', 'error'); return; }
    if (!divides) { toast('La duración no divide exactamente el rango horario', 'error'); return; }
    if (preview === 0) { toast('No hay slots válidos para crear', 'error'); return; }
    if (preview > 500) { toast(`Se generarían ${preview} slots, máximo 500`, 'error'); return; }

    setSubmitting(true);
    try {
      const data = await api.post<BulkResult>('/admin/time-blocks/bulk', {
        doctorId: Number(doctorId),
        startDate,
        endDate,
        daysOfWeek,
        startHour,
        endHour,
        slotDurationMin,
      });
      setResult(data);
      onSuccess();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error al crear bloques', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Crear bloques en masa</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">✕</button>
        </div>

        {result ? (
          <div className="p-6 text-center space-y-3">
            <div className="text-4xl">✅</div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {result.created} slot{result.created !== 1 ? 's' : ''} creado{result.created !== 1 ? 's' : ''}
            </p>
            {result.skipped > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{result.skipped} ya existían y fueron salteados</p>
            )}
            <button
              onClick={onClose}
              className="mt-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Doctor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Doctor</label>
              <select
                value={doctorId}
                onChange={e => setDoctorId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Seleccionar doctor...</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
                ))}
              </select>
            </div>

            {/* Rango de fechas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Desde</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  min={todayISO()}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hasta</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  min={startDate || todayISO()}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Días de la semana */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Días de la semana</label>
              <div className="flex gap-1 flex-wrap">
                {DAYS.map((label, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      daysOfWeek.includes(idx)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Horario */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora inicio</label>
                <input
                  type="number"
                  value={startHour}
                  onChange={e => setStartHour(Number(e.target.value))}
                  min={0} max={23}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora fin</label>
                <input
                  type="number"
                  value={endHour}
                  onChange={e => setEndHour(Number(e.target.value))}
                  min={1} max={24}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duración (min)</label>
                <select
                  value={slotDurationMin}
                  onChange={e => setSlotDurationMin(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {SLOT_DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
            </div>

            {/* Preview */}
            <div className={`rounded-lg px-4 py-3 text-sm ${
              preview > 500
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                : preview > 0 && divides
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400'
            }`}>
              {!divides && rangeMin > 0
                ? `⚠️ ${slotDurationMin} min no divide exactamente ${rangeMin} min`
                : preview > 500
                  ? `⚠️ ${preview} slots exceden el máximo de 500`
                  : preview > 0
                    ? `✓ Se crearán hasta ${preview} slots`
                    : 'Completá los campos para ver el preview'}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !divides || preview === 0 || preview > 500}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creando...' : `Crear ${preview > 0 ? preview + ' slots' : 'bloques'}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
