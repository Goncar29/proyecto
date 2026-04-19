import { useState, useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import UserAvatar from '@/components/UserAvatar';

const inputClass =
  'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none';

export default function Settings() {
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();

  // ── Sección datos personales ───────────────────────────────────────────────
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError]   = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileError('');
    const trimmedName  = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      setProfileError('El nombre debe tener al menos 2 caracteres.');
      return;
    }

    setSavingProfile(true);
    try {
      await api.put<unknown>(`/users/${user!.id}`, {
        name: trimmedName,
        email: trimmedEmail,
      });
      await refreshUser();
      toast('Datos actualizados con éxito.', 'success');
    } catch (err) {
      const e = err as Error & { code?: string };
      setProfileError(e.message || 'Error al actualizar los datos.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Sección foto de perfil ────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast('El archivo es muy grande. El límite es 5 MB.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadingPhoto(true);
    try {
      await api.postFile<{ photoUrl: string }>('/users/me/photo', formData);
      await refreshUser();
      toast('Foto actualizada con éxito.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Error al subir la foto.', 'error');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Sección cambio de contraseña ───────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword]   = useState(false);
  const [passwordError, setPasswordError]     = useState('');

  const handleSavePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.patch<{ message: string }>('/users/me/password', { currentPassword, newPassword });
      toast('Contraseña actualizada con éxito.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === 'WRONG_CURRENT_PASSWORD') {
        setPasswordError('La contraseña actual es incorrecta.');
      } else if (e.code === 'SAME_PASSWORD') {
        setPasswordError('La nueva contraseña debe ser diferente a la actual.');
      } else {
        setPasswordError(e.message || 'Error al actualizar la contraseña.');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ajustes</h1>

      {/* ── Foto de perfil ── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Foto de perfil</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          JPG, PNG o WebP. Máximo 5 MB.
        </p>
        <div className="flex items-center gap-5">
          <UserAvatar name={user?.name ?? ''} photoUrl={user?.photoUrl} size="lg" />
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className={`inline-block cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {uploadingPhoto ? 'Subiendo...' : user?.photoUrl ? 'Cambiar foto' : 'Subir foto'}
            </label>
            {user?.photoUrl && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Re-subir reemplaza la foto anterior automáticamente.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Datos personales ── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Datos personales</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Actualizá tu nombre o email de acceso.
        </p>

        {profileError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {profileError}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile || (name === user?.name && email === user?.email)}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {savingProfile ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      {/* ── Cambiar contraseña ── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Cambiar contraseña</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Ingresá tu contraseña actual y después la nueva.
        </p>

        {passwordError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {passwordError}
          </div>
        )}

        <form onSubmit={handleSavePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña actual</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nueva contraseña</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} placeholder="Mínimo 8 caracteres" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar nueva contraseña</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} className={inputClass} />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {savingPassword ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
