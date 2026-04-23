import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { api } from '@/api/client';
import { useToast } from '@/context/ToastContext';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!token) navigate('/login', { replace: true });
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }

    setLoading(true);
    try {
      await api.post<{ message: string }>('/auth/reset-password', { token, newPassword: password });
      toast('Contraseña actualizada. Iniciá sesión con la nueva.', 'success');
      navigate('/login', { replace: true });
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === 'INVALID_TOKEN') setExpired(true);
      else setError(e.message || 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const cardClass = "w-full max-w-md rounded-[var(--radius-2xl)] bg-[var(--color-card)] p-8";

  if (expired) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          className={cardClass}
          style={{ boxShadow: 'var(--shadow-card-hover)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Link inválido o expirado
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">
            El link ya fue usado o venció (válido por 30 minutos).
          </p>
          <Link
            to="/forgot-password"
            className="inline-block px-5 py-2.5 rounded-[var(--radius-md)] font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Pedir un link nuevo
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        className={cardClass}
        style={{ boxShadow: 'var(--shadow-card-hover)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Nueva contraseña
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Elegí una contraseña nueva para tu cuenta.
        </p>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--color-danger-light)] border border-[var(--color-danger)]/20 text-[var(--color-danger)] text-sm mb-4" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-pw" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Nueva contraseña</label>
            <input
              id="reset-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-shadow"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <label htmlFor="reset-confirm" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Confirmar contraseña</label>
            <input
              id="reset-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-shadow"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-[var(--radius-md)] font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
