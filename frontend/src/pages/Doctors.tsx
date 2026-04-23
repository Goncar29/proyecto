import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { api } from '@/api/client';
import { CardSkeleton } from '@/components/Skeleton';
import DoctorAvatar from '@/components/DoctorAvatar';

interface DoctorListItem {
  id: number;
  name: string;
  specialty: string;
  hospital?: string;
  location?: string;
  photoUrl?: string;
  avgRating: number;
  reviewCount: number;
}

interface PaginatedDoctors {
  items: DoctorListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export default function Doctors() {
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (debouncedSearch) params.q = debouncedSearch;
    api.get<PaginatedDoctors>('/public/doctors', params)
      .then(res => setDoctors(res.items))
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  return (
    <div>
      <div className="mb-8">
        <h1
          className="text-3xl font-bold text-[var(--color-text)] mb-2"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Encontrá tu doctor
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Buscá por nombre, especialidad o ubicación.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar por nombre o especialidad..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Buscar doctores"
          className="w-full pl-12 pr-4 py-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-shadow text-base"
          style={{ boxShadow: 'var(--shadow-card)' }}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[var(--color-text-muted)] text-lg">No se encontraron doctores.</p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="mt-3 text-sm font-medium text-[var(--color-primary)] hover:underline underline-offset-4"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <Link
                to={`/doctors/${d.id}`}
                className="group flex gap-4 items-start rounded-[var(--radius-xl)] p-5 bg-[var(--color-card)] transition-all duration-200 hover:translate-y-[-2px]"
                style={{ boxShadow: 'var(--shadow-card)' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
              >
                <DoctorAvatar name={d.name} photoUrl={d.photoUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-[var(--color-text)] text-lg leading-tight truncate group-hover:text-[var(--color-primary)] transition-colors">
                    {d.name}
                  </h3>
                  <p className="text-[var(--color-primary)] text-sm mt-0.5">{d.specialty}</p>
                  {d.location && (
                    <p className="text-[var(--color-text-muted)] text-sm truncate mt-0.5">{d.location}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-amber-500 text-sm" aria-hidden="true">{'★'.repeat(Math.round(d.avgRating))}</span>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {d.avgRating.toFixed(1)} ({d.reviewCount})
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
