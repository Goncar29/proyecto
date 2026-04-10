import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { DoctorProfile, PaginatedResponse } from '@/types';

export default function Doctors() {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PaginatedResponse<DoctorProfile>>('/public/doctors')
      .then(res => setDoctors(res.items))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ padding: '2rem' }}>Cargando doctores...</p>;

  return (
    <main style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1>Doctores</h1>
      {doctors.length === 0 ? (
        <p>No hay doctores disponibles.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {doctors.map(d => (
            <li key={d.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1rem' }}>
              <Link to={`/doctors/${d.userId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <h3>{d.user?.name ?? `Doctor #${d.userId}`}</h3>
                <p>{d.specialty} — {d.location ?? 'Sin ubicación'}</p>
                <p>Rating: {d.avgRating.toFixed(1)} ({d.reviewCount} reviews)</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
