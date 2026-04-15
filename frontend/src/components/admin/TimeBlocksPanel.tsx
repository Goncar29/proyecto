import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useToast } from '@/context/ToastContext';

interface TimeBlockWithDoctor {
  id: number;
  doctorId: number;
  date: string;
  startTime: string;
  endTime: string;
  doctor?: { name: string };
}

interface DoctorOption {
  id: number;
  name: string;
  specialty: string;
}

export default function TimeBlocksPanel() {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<TimeBlockWithDoctor[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<TimeBlockWithDoctor[]>('/time-blocks'),
      api.get<{ items: DoctorOption[] }>('/public/doctors', { pageSize: '50' }),
    ])
      .then(([tb, docs]) => {
        setBlocks(tb);
        setDoctors(docs.items);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!doctorId || !date || !startTime || !endTime) return;
    setSubmitting(true);
    try {
      const startISO = new Date(`${date}T${startTime}:00`).toISOString();
      const endISO = new Date(`${date}T${endTime}:00`).toISOString();
      const block = await api.post<TimeBlockWithDoctor>('/time-blocks', {
        doctorId: Number(doctorId),
        startTime: startISO,
        endTime: endISO,
      });
      setBlocks(prev => [block, ...prev]);
      setShowForm(false);
      setDoctorId('');
      setDate('');
      setStartTime('');
      setEndTime('');
      toast('Bloque de tiempo creado', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error al crear bloque', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/time-blocks/${id}`);
      setBlocks(prev => prev.filter(b => b.id !== id));
      toast('Bloque eliminado', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error al eliminar', 'error');
    }
  };

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Cargando bloques...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Bloques de tiempo</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo bloque'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            value={doctorId}
            onChange={e => setDoctorId(e.target.value)}
            required
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Seleccionar doctor</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="time"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            required
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="time"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            required
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Creando...' : 'Crear'}
          </button>
        </form>
      )}

      {blocks.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No hay bloques de tiempo registrados.</p>
      ) : (
        <div className="space-y-2">
          {blocks
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
            .map(b => {
              const dateStr = new Date(b.date).toLocaleDateString();
              const start = new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const end = new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const doctorName = doctors.find(d => d.id === b.doctorId)?.name ?? `Doctor #${b.doctorId}`;
              return (
                <div key={b.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{doctorName}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm ml-3">{dateStr}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">{start} – {end}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-3 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Eliminar
                  </button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
