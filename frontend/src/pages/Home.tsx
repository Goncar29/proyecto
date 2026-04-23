import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { api } from '@/api/client';
import DoctorAvatar from '@/components/DoctorAvatar';

interface Stats {
  doctorCount: number;
  appointmentCount: number;
  reviewCount: number;
}

interface FeaturedDoctor {
  id: number;
  name: string;
  specialty: string;
  photoUrl?: string;
  avgRating: number;
  reviewCount: number;
}

interface PaginatedDoctors {
  items: FeaturedDoctor[];
  total: number;
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [featured, setFeatured] = useState<FeaturedDoctor[]>([]);

  useEffect(() => {
    api.get<Stats>('/public/doctors/stats').then(setStats).catch(() => {});
    api.get<PaginatedDoctors>('/public/doctors', { featured: 'true', limit: '4' })
      .then(res => setFeatured(res.items))
      .catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative text-center py-16 sm:py-24 overflow-hidden">
        {/* Background gradient */}
        <div
          className="absolute inset-0 -z-10 opacity-40 dark:opacity-20"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 0%, var(--color-primary-subtle), transparent)',
          }}
          aria-hidden="true"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--color-text)] mb-4 tracking-tight"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Tu salud, <span className="text-[var(--color-primary)]">simplificada</span>
          </h1>
          <p className="text-lg sm:text-xl text-[var(--color-text-secondary)] mb-10 max-w-2xl mx-auto px-4 leading-relaxed">
            Encontrá doctores, consultá su disponibilidad y reservá turnos en minutos. Sin llamadas, sin esperas.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Link
            to="/doctors"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors shadow-lg shadow-[var(--color-primary)]/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Buscar doctores
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold rounded-[var(--radius-lg)] border-2 border-[var(--color-border-strong)] text-[var(--color-text)] hover:bg-[var(--color-card-hover)] transition-colors"
          >
            Crear cuenta gratis
          </Link>
        </motion.div>
      </section>

      {/* Stats */}
      {stats && (
        <motion.section
          className="grid grid-cols-3 gap-4 sm:gap-6 max-w-2xl mx-auto mb-16 px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          aria-label="Estadísticas de la plataforma"
        >
          <StatCard value={stats.doctorCount} label="Doctores" />
          <StatCard value={stats.appointmentCount} label="Citas gestionadas" />
          <StatCard value={stats.reviewCount} label="Reviews" />
        </motion.section>
      )}

      {/* Featured doctors */}
      {featured.length > 0 && (
        <section className="mb-16" aria-label="Doctores destacados">
          <div className="flex items-center justify-between mb-6 px-1">
            <h2
              className="text-2xl font-bold text-[var(--color-text)]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Doctores destacados
            </h2>
            <Link
              to="/doctors"
              className="text-sm font-medium text-[var(--color-primary)] hover:underline underline-offset-4"
            >
              Ver todos
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
              >
                <Link
                  to={`/doctors/${doc.id}`}
                  className="group block rounded-[var(--radius-xl)] p-5 bg-[var(--color-card)] transition-all duration-200 hover:translate-y-[-2px]"
                  style={{ boxShadow: 'var(--shadow-card)' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
                >
                  <div className="flex flex-col items-center text-center">
                    <DoctorAvatar name={doc.name} photoUrl={doc.photoUrl} size="lg" />
                    <h3 className="mt-3 font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors truncate max-w-full">
                      {doc.name}
                    </h3>
                    <p className="text-sm text-[var(--color-primary)] mt-0.5">{doc.specialty}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-amber-500 text-sm" aria-hidden="true">{'★'.repeat(Math.round(doc.avgRating))}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {doc.avgRating.toFixed(1)} ({doc.reviewCount})
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="mb-16" aria-label="Cómo funciona">
        <h2
          className="text-2xl font-bold text-[var(--color-text)] text-center mb-10"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Cómo funciona
        </h2>
        <div className="grid gap-6 sm:grid-cols-3 max-w-3xl mx-auto">
          {[
            { step: '1', title: 'Buscá un doctor', desc: 'Filtrá por especialidad, ubicación o disponibilidad.' },
            { step: '2', title: 'Elegí un horario', desc: 'Consultá los turnos disponibles en tiempo real.' },
            { step: '3', title: 'Confirmá tu turno', desc: 'Recibí la confirmación por email. Listo.' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              className="text-center px-4"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div
                className="w-12 h-12 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] font-bold text-lg flex items-center justify-center mx-auto mb-3"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {item.step}
              </div>
              <h3 className="font-semibold text-[var(--color-text)] mb-1">{item.title}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center py-4 px-2 rounded-[var(--radius-xl)] bg-[var(--color-card)]" style={{ boxShadow: 'var(--shadow-card)' }}>
      <p className="text-2xl sm:text-3xl font-bold text-[var(--color-primary)]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {value.toLocaleString('es-AR')}
      </p>
      <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1">{label}</p>
    </div>
  );
}
