import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { api } from '@/api/client';
import { useToast } from '@/context/ToastContext';

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post<{ message: string }>('/auth/forgot-password', { email });
      setSent(true);
      toast('Revisá tu bandeja de entrada', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error al enviar el link', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        className="w-full max-w-md rounded-[var(--radius-2xl)] bg-[var(--color-card)] p-8"
        style={{ boxShadow: 'var(--shadow-card-hover)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1
          className="text-2xl font-bold text-[var(--color-text)] mb-1"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          ¿Olvidaste tu contraseña?
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Ingresá tu email y te mandamos un link para elegir una nueva.
        </p>

        {sent ? (
          <div className="px-4 py-4 rounded-[var(--radius-md)] bg-[var(--color-success-light)] border border-[var(--color-success)]/20 text-[var(--color-success)]" role="status">
            <p className="font-medium mb-1">Si el email existe, te llegará un link.</p>
            <p className="text-sm opacity-80">Revisá tu bandeja de entrada (y spam). El link expira en 30 minutos.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-shadow"
                placeholder="tu@email.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-[var(--radius-md)] font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Enviando...' : 'Enviar link'}
            </button>
          </form>
        )}

        <p className="mt-5 text-sm text-[var(--color-text-secondary)]">
          <Link to="/login" className="font-medium text-[var(--color-primary)] hover:underline underline-offset-4">
            ← Volver a iniciar sesión
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
