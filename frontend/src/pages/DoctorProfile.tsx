import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/api/client';
import DoctorAvatar from '@/components/DoctorAvatar';

interface DoctorProfileData {
  id: number;
  name: string;
  specialty: string;
  specialties: string[];
  hospital: string | null;
  location: string | null;
  bio: string | null;
  photoUrl: string | null;
  avgRating: number;
  reviewCount: number;
}

interface ProfileForm {
  specialty: string;
  specialties: string[];
  hospital: string;
  location: string;
  bio: string;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm';

const labelClass = 'block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1';

export default function DoctorProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Photo upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [form, setForm] = useState<ProfileForm>({
    specialty: '',
    specialties: [],
    hospital: '',
    location: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);
  const [specialtyInput, setSpecialtyInput] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    api.get<DoctorProfileData>(`/public/doctors/${user.id}`)
      .then(data => {
        setProfile(data);
        setForm({
          specialty:   data.specialty ?? '',
          specialties: data.specialties ?? [],
          hospital:    data.hospital ?? '',
          location:    data.location ?? '',
          bio:         data.bio ?? '',
        });
      })
      .catch(() => toast('No se pudo cargar el perfil', 'error'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  // ── Photo handlers ────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) { toast('El archivo supera el límite de 5 MB', 'error'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('Tipo no permitido. Usá JPG, PNG o WebP', 'error'); return;
    }
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      const res = await api.postFile<{ photoUrl: string }>('/doctors/me/photo', fd);
      setProfile(prev => prev ? { ...prev, photoUrl: res.photoUrl } : prev);
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast('Foto actualizada con éxito', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error al subir la foto', 'error');
    } finally {
      setUploading(false);
    }
  };

  const cancelPreview = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Specialties chip handlers ─────────────────────────────────────────────

  const addSpecialty = () => {
    const val = specialtyInput.trim();
    if (!val || val.length < 2 || form.specialties.includes(val)) return;
    setForm(prev => ({ ...prev, specialties: [...prev.specialties, val] }));
    setSpecialtyInput('');
  };

  const removeSpecialty = (s: string) => {
    setForm(prev => ({ ...prev, specialties: prev.specialties.filter(x => x !== s) }));
  };

  const onSpecialtyKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addSpecialty(); }
    if (e.key === 'Backspace' && !specialtyInput && form.specialties.length > 0) {
      setForm(prev => ({ ...prev, specialties: prev.specialties.slice(0, -1) }));
    }
  };

  // ── Profile save ──────────────────────────────────────────────────────────

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.specialty.trim()) { toast('La especialidad principal es obligatoria', 'error'); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        specialty:   form.specialty.trim(),
        specialties: form.specialties,
        hospital:    form.hospital.trim() || null,
        location:    form.location.trim() || null,
        bio:         form.bio.trim() || null,
      };
      const updated = await api.patch<DoctorProfileData>('/doctors/me/profile', payload);
      setProfile(prev => prev ? { ...prev, ...updated } : prev);
      toast('Perfil actualizado con éxito', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error al guardar el perfil', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  if (!profile) return <p className="text-red-600">No se pudo cargar el perfil.</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi perfil</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span>⭐ {profile.avgRating.toFixed(1)}</span>
          <span>{profile.reviewCount} reviews</span>
        </div>
      </div>

      {/* ── Photo ── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Foto de perfil</h2>
        <div className="flex items-center gap-6">
          <DoctorAvatar name={profile.name} photoUrl={preview ?? profile.photoUrl} size="lg" />
          <div className="flex-1 space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">JPG, PNG o WebP · Máximo 5 MB</p>
            <div className="flex flex-wrap gap-2">
              <label
                htmlFor="photo-input"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Elegir imagen
              </label>
              <input id="photo-input" ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
              {selectedFile && (
                <>
                  <button onClick={handleUpload} disabled={uploading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {uploading ? 'Subiendo...' : 'Guardar foto'}
                  </button>
                  <button onClick={cancelPreview} disabled={uploading} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors">
                    Cancelar
                  </button>
                </>
              )}
            </div>
            {selectedFile && (
              <p className="text-xs text-gray-400 dark:text-gray-500">{selectedFile.name} · {(selectedFile.size / 1024).toFixed(0)} KB</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit form ── */}
      <form onSubmit={handleSaveProfile} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Información profesional</h2>

        {/* Specialty principal */}
        <div>
          <label className={labelClass}>Especialidad principal *</label>
          <input
            type="text"
            value={form.specialty}
            onChange={e => setForm(prev => ({ ...prev, specialty: e.target.value }))}
            placeholder="Ej: Cardiología"
            maxLength={100}
            required
            className={inputClass}
          />
        </div>

        {/* Specialties (chips) */}
        <div>
          <label className={labelClass}>Otras especialidades</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.specialties.map(s => (
              <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                {s}
                <button type="button" onClick={() => removeSpecialty(s)} className="hover:text-blue-900 dark:hover:text-blue-100 font-bold leading-none">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={specialtyInput}
              onChange={e => setSpecialtyInput(e.target.value)}
              onKeyDown={onSpecialtyKeyDown}
              placeholder="Agregar especialidad y presionar Enter"
              maxLength={100}
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={addSpecialty}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              +
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Presioná Enter o el botón + para agregar</p>
        </div>

        {/* Hospital */}
        <div>
          <label className={labelClass}>Hospital / Clínica</label>
          <input
            type="text"
            value={form.hospital}
            onChange={e => setForm(prev => ({ ...prev, hospital: e.target.value }))}
            placeholder="Ej: Hospital Italiano"
            maxLength={200}
            className={inputClass}
          />
        </div>

        {/* Location */}
        <div>
          <label className={labelClass}>Ubicación</label>
          <input
            type="text"
            value={form.location}
            onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Ej: Buenos Aires, Argentina"
            maxLength={200}
            className={inputClass}
          />
        </div>

        {/* Bio */}
        <div>
          <label className={labelClass}>Biografía</label>
          <textarea
            value={form.bio}
            onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="Contá tu experiencia, formación y enfoque médico..."
            maxLength={2000}
            rows={4}
            className={`${inputClass} resize-y`}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">{form.bio.length}/2000</p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
