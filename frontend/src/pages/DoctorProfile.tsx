import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/api/client';
import DoctorAvatar from '@/components/DoctorAvatar';

interface DoctorProfileData {
  id: number;
  name: string;
  specialty: string;
  specialties?: string[];
  hospital?: string;
  location?: string;
  bio?: string;
  photoUrl?: string | null;
  avgRating: number;
  reviewCount: number;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

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

  useEffect(() => {
    if (!user?.id) return;
    api.get<DoctorProfileData>(`/public/doctors/${user.id}`)
      .then(setProfile)
      .catch(() => toast('No se pudo cargar el perfil', 'error'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BYTES) {
      toast('El archivo supera el límite de 5 MB', 'error');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('Tipo no permitido. Usá JPG, PNG o WebP', 'error');
      return;
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

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-red-600">No se pudo cargar el perfil.</p>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi perfil</h1>

      {/* Photo section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Foto de perfil</h2>

        <div className="flex items-center gap-6">
          {/* Current / preview avatar */}
          <DoctorAvatar
            name={profile.name}
            photoUrl={preview ?? profile.photoUrl}
            size="lg"
          />

          <div className="flex-1 space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              JPG, PNG o WebP · Máximo 5 MB
            </p>

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
              <input
                id="photo-input"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {selectedFile && (
                <>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {uploading ? 'Subiendo...' : 'Guardar foto'}
                  </button>
                  <button
                    onClick={cancelPreview}
                    disabled={uploading}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>

            {selectedFile && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {selectedFile.name} · {(selectedFile.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Profile info (read-only for now — Phase 3 adds edit form) */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Información</h2>
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Nombre</p>
          <p className="text-gray-800 dark:text-gray-200">{profile.name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Especialidad principal</p>
          <p className="text-gray-800 dark:text-gray-200">{profile.specialty}</p>
        </div>
        {profile.hospital && (
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Hospital</p>
            <p className="text-gray-800 dark:text-gray-200">{profile.hospital}</p>
          </div>
        )}
        {profile.location && (
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Ubicación</p>
            <p className="text-gray-800 dark:text-gray-200">{profile.location}</p>
          </div>
        )}
        {profile.bio && (
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Bio</p>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{profile.bio}</p>
          </div>
        )}
        <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Rating</p>
            <p className="text-gray-800 dark:text-gray-200 font-semibold">⭐ {profile.avgRating.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Reviews</p>
            <p className="text-gray-800 dark:text-gray-200 font-semibold">{profile.reviewCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
