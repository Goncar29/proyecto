import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useToast } from '@/context/ToastContext';
import BulkTimeBlocksModal from './BulkTimeBlocksModal';

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

interface PaginatedBlocks {
  items: TimeBlockWithDoctor[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

export default function TimeBlocksPanel() {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<TimeBlockWithDoctor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function fetchAllDoctors(): Promise<DoctorOption[]> {
    const PAGE_SIZE_DOC = 50;
    let p = 1;
    let all: DoctorOption[] = [];
    while (true) {
      const data = await api.get<{ items: DoctorOption[]; total: number }>(
        '/public/doctors',
        { pageSize: String(PAGE_SIZE_DOC), page: String(p) }
      );
      all = [...all, ...data.items];
      if (all.length >= data.total) break;
      p++;
    }
    return all;
  }

  async function fetchBlocks(p: number) {
    setLoading(true);
    try {
      const data = await api.get<PaginatedBlocks>('/time-blocks', {
        page: String(p),
        pageSize: String(PAGE_SIZE),
      });
      setBlocks(data.items);
      setTotal(data.total);
    } catch {
      toast('Error al cargar bloques', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([fetchBlocks(1), fetchAllDoctors()])
      .then(([, allDoctors]) => setDoctors(allDoctors));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!doctorId || !date || !startTime || !endTime) return;
    if (endTime <= startTime) {
      toast('La hora de fin debe ser posterior a la hora de inicio', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const startISO = new Date(`${date}T${startTime}:00`).toISOString();
      const endISO = new Date(`${date}T${endTime}:00`).toISOString();
      await api.post<TimeBlockWithDoctor>('/time-blocks', {
        doctorId: Number(doctorId),
        startTime: startISO,
        endTime: endISO,
      });
      setShowForm(false);
      setDoctorId('');
      setDate('');
      setStartTime('');
      setEndTime('');
      toast('Bloque de tiempo creado', 'success');
      // Reload page 1 to show the new block
      setPage(1);
      fetchBlocks(1);
      fetchAllDoctors().then(setDoctors);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error al crear bloque', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/time-blocks/${id}`);
      toast('Bloque eliminado', 'success');
      // Reload current page (if it becomes empty, go to page 1)
      const newTotal = total - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
      const targetPage = Math.min(page, newTotalPages);
      setPage(targetPage);
      fetchBlocks(targetPage);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error al eliminar', 'error');
    }
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchBlocks(p);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Bloques de tiempo
          {!loading && <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-2">({total} total)</span>}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="text-sm bg-purple-600 text-white px-4 py-1.5 rounded-lg hover:bg-purple-700"
          >
            Crear en masa
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700"
          >
            {showForm ? 'Cancelar' : '+ Nuevo bloque'}
          </button>
        </div>
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
            min={new Date().toISOString().slice(0, 10)}
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

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Cargando bloques...</p>
      ) : blocks.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No hay bloques de tiempo registrados.</p>
      ) : (
        <div className="space-y-2">
          {blocks.map(b => {
            const dateStr = new Date(b.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
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

      {showBulkModal && (
        <BulkTimeBlocksModal
          doctors={doctors}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setPage(1);
            fetchBlocks(1);
            fetchAllDoctors().then(setDoctors);
          }}
        />
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            ← Anterior
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
