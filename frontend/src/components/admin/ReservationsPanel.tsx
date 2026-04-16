import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useToast } from '@/context/ToastContext';

interface Reservation {
  id: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  date: string;
  reason?: string;
  notes?: string;
  patient: { id: number; name: string; email: string };
  doctor: { id: number; name: string; email: string };
  timeBlock?: { startTime: string; endTime: string; date: string };
  createdAt?: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const PAGE_SIZE = 20;

export default function ReservationsPanel() {
  const { toast } = useToast();
  const [all, setAll] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get<Reservation[]>('/admin/reservations')
      .then(data => setAll(data))
      .catch(() => toast('Error al cargar reservaciones', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Filtrado y búsqueda en el cliente (backend no pagina este endpoint aún)
  const filtered = all.filter(r => {
    const matchesStatus = !statusFilter || r.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q
      || r.patient.name.toLowerCase().includes(q)
      || r.patient.email.toLowerCase().includes(q)
      || r.doctor.name.toLowerCase().includes(q)
      || r.doctor.email.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Reservaciones</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {filtered.length} de {all.length} total
        </p>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Buscar paciente o doctor..."
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm flex-1 min-w-48 max-w-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <select
          value={statusFilter}
          onChange={e => handleStatusChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Cargando reservaciones...</p>
      ) : paginated.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No se encontraron reservaciones.</p>
      ) : (
        <div className="space-y-2">
          {paginated.map(r => {
            const start = r.timeBlock
              ? new Date(r.timeBlock.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '—';
            const end = r.timeBlock
              ? new Date(r.timeBlock.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '—';
            const dateStr = r.timeBlock
              ? new Date(r.timeBlock.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
              : new Date(r.date).toLocaleDateString('es-AR');

            return (
              <div
                key={r.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 dark:text-white">{r.patient.name}</span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">{r.patient.email}</span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="text-blue-600 dark:text-blue-400">Dr. {r.doctor.name}</span>
                      <span className="mx-2">·</span>
                      <span>{dateStr}</span>
                      <span className="mx-1">·</span>
                      <span>{start} – {end}</span>
                    </div>
                    {r.reason && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic">"{r.reason}"</p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[r.status] ?? ''}`}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            ← Anterior
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
