import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '@/context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordStrength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthLabel = ['', 'Débil', 'Aceptable', 'Fuerte'];
  const strengthColor = ['', 'var(--color-danger)', 'var(--color-warning)', 'var(--color-success)'];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
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
          Crear cuenta
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Registrate para reservar turnos y gestionar tu salud.
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
            <label htmlFor="reg-name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Nombre completo
            </label>
            <input
              id="reg-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoComplete="name"
              className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-shadow"
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Email
            </label>
            <input
              id="reg-email"
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
            <label htmlFor="reg-password" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Contraseña
            </label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-shadow"
              placeholder="Mínimo 8 caracteres"
            />
            {password.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(passwordStrength / 3) * 100}%`,
                      backgroundColor: strengthColor[passwordStrength],
                    }}
                  />
                </div>
                <span className="text-xs font-medium" style={{ color: strengthColor[passwordStrength] }}>
                  {strengthLabel[passwordStrength]}
                </span>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-[var(--radius-md)] font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creando...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-5 text-sm text-[var(--color-text-secondary)]">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="font-medium text-[var(--color-primary)] hover:underline underline-offset-4">Iniciá sesión</Link>
        </p>
      </motion.div>
    </div>
  );
}
