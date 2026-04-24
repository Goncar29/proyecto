import { useState, useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import UserAvatar from '@/components/UserAvatar';

const inputClass =
  'w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-shadow';

const labelClass = 'block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5';

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[var(--radius-xl)] bg-[var(--color-card)] p-6"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <h2
        className="text-lg font-semibold text-[var(--color-text)] mb-1"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {title}
      </h2>
      <p className="text-sm text-[var(--color-text-muted)] mb-5">{description}</p>
      {children}
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();

  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError]   = useState('');

  useEffect(() => {
    if (user) { setName(user.name); setEmail(user.email); }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileError('');
    const trimmedName  = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedName.length < 2) { setProfileError('El nombre debe tener al menos 2 caracteres.'); return; }
    setSavingProfile(true);
    try {
      await api.put<unknown>(`/users/${user!.id}`, { name: trimmedName, email: trimmedEmail });
      await refreshUser();
      toast('Datos actualizados con éxito.', 'success');
    } catch (err) {
      setProfileError((err as Error).message || 'Error al actualizar los datos.');
    } finally {
      setSavingProfile(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('El archivo es muy grande. El límite es 5 MB.', 'error'); return; }
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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword]   = useState(false);
  const [passwordError, setPasswordError]     = useState('');

  const handleSavePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword.length < 8) { setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Las contraseñas nuevas no coinciden.'); return; }
    setSavingPassword(true);
    try {
      await api.patch<{ message: string }>('/users/me/password', { currentPassword, newPassword });
      toast('Contraseña actualizada con éxito.', 'success');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === 'WRONG_CURRENT_PASSWORD') setPasswordError('La contraseña actual es incorrecta.');
      else if (e.code === 'SAME_PASSWORD') setPasswordError('La nueva contraseña debe ser diferente a la actual.');
      else setPasswordError(e.message || 'Error al actualizar la contraseña.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1
        className="text-3xl font-bold text-[var(--color-text)]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        Ajustes
      </h1>

      {/* Photo */}
      <SectionCard title="Foto de perfil" description="JPG, PNG o WebP. Máximo 5 MB.">
        <div className="flex items-center gap-5">
          <UserAvatar name={user?.name ?? ''} photoUrl={user?.photoUrl} size="lg" />
          <div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" id="photo-upload" />
            <label
              htmlFor="photo-upload"
              className={`inline-block cursor-pointer px-4 py-2 rounded-[var(--radius-md)] font-medium text-sm text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {uploadingPhoto ? 'Subiendo...' : user?.photoUrl ? 'Cambiar foto' : 'Subir foto'}
            </label>
            {user?.photoUrl && (
              <p className="text-xs text-[var(--color-text-muted)] mt-2">Re-subir reemplaza la foto anterior.</p>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Personal data */}
      <SectionCard title="Datos personales" description="Actualizá tu nombre o email de acceso.">
        {profileError && (
          <div className="px-4 py-3 rounded-[var(--radius-md)] bg-[var(--color-danger-light)] border border-[var(--color-danger)]/20 text-[var(--color-danger)] text-sm mb-4" role="alert">
            {profileError}
          </div>
        )}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label htmlFor="settings-name" className={labelClass}>Nombre</label>
            <input id="settings-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className={inputClass} />
          </div>
          <div>
            <label htmlFor="settings-email" className={labelClass}>Email</label>
            <input id="settings-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
          </div>
          <button
            type="submit"
            disabled={savingProfile || (name === user?.name && email === user?.email)}
            className="w-full py-2.5 rounded-[var(--radius-md)] font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
          >
            {savingProfile ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </SectionCard>

      {/* Password */}
      <SectionCard title="Cambiar contraseña" description="Ingresá tu contraseña actual y después la nueva.">
        {passwordError && (
          <div className="px-4 py-3 rounded-[var(--radius-md)] bg-[var(--color-danger-light)] border border-[var(--color-danger)]/20 text-[var(--color-danger)] text-sm mb-4" role="alert">
            {passwordError}
          </div>
        )}
        <form onSubmit={handleSavePassword} className="space-y-4">
          <div>
            <label htmlFor="settings-current-pw" className={labelClass}>Contraseña actual</label>
            <input id="settings-current-pw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" className={inputClass} />
          </div>
          <div>
            <label htmlFor="settings-new-pw" className={labelClass}>Nueva contraseña</label>
            <input id="settings-new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} placeholder="Mínimo 8 caracteres" autoComplete="new-password" className={inputClass} />
          </div>
          <div>
            <label htmlFor="settings-confirm-pw" className={labelClass}>Confirmar nueva contraseña</label>
            <input id="settings-confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" className={inputClass} />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="w-full py-2.5 rounded-[var(--radius-md)] font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
          >
            {savingPassword ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
