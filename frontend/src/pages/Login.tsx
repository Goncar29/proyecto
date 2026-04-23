import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      toast('Tu sesión expiró. Iniciá sesión de nuevo.', 'error');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
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
          Iniciar sesión
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Ingresá tus credenciales para acceder a tu cuenta.
        </p>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--color-danger-light)] border border-[var(--color-danger)]/20 text-[var(--color-danger)] text-sm mb-4" role="alert">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-shadow"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-shadow"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-[var(--radius-md)] font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <p className="text-[var(--color-text-secondary)]">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="font-medium text-[var(--color-primary)] hover:underline underline-offset-4">Registrate</Link>
          </p>
          <Link to="/forgot-password" className="text-[var(--color-primary)] hover:underline underline-offset-4">
            Olvidé mi contraseña
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
