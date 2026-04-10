import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
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

  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    api.get<PaginatedDoctors>('/public/doctors', params)
      .then(res => setDoctors(res.items))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Doctores</h1>
      <input
        type="text"
        placeholder="Buscar por nombre o especialidad..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-6 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      />
      {loading ? (
        <p className="text-gray-500">Cargando doctores...</p>
      ) : doctors.length === 0 ? (
        <p className="text-gray-500">No se encontraron doctores.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map(d => (
            <Link
              key={d.id}
              to={`/doctors/${d.id}`}
              className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold text-gray-900 text-lg">
                {d.name}
              </h3>
              <p className="text-blue-600 text-sm mt-1">{d.specialty}</p>
              {d.location && <p className="text-gray-500 text-sm">{d.location}</p>}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-yellow-500">{'★'.repeat(Math.round(d.avgRating))}</span>
                <span className="text-sm text-gray-600">
                  {d.avgRating.toFixed(1)} ({d.reviewCount})
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
