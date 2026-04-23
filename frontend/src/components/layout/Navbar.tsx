import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import UserAvatar from '@/components/UserAvatar';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  const linkClass = (path: string) =>
    `text-sm font-medium transition-colors ${
      isActive(path)
        ? 'text-[var(--color-primary)]'
        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
    }`;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <nav
        className={`sticky top-0 z-50 px-4 sm:px-6 py-3 transition-all duration-200 ${
          scrolled
            ? 'backdrop-blur-xl bg-[var(--color-card)]/90 border-b border-[var(--color-border)]'
            : 'bg-[var(--color-card)] border-b border-transparent'
        }`}
        style={{ boxShadow: scrolled ? 'var(--shadow-nav)' : 'none' }}
        role="navigation"
        aria-label="Navegación principal"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" aria-label="MediConnect — Inicio">
            <svg className="w-7 h-7 text-[var(--color-primary)] transition-transform group-hover:scale-105" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="28" height="28" rx="8" fill="currentColor" fillOpacity="0.1"/>
              <path d="M14 7v14M7 14h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span className="text-lg font-bold text-[var(--color-text)]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Medi<span className="text-[var(--color-primary)]">Connect</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-6">
            <Link to="/doctors" className={linkClass('/doctors')}>Doctores</Link>
            {user ? (
              <>
                <Link to="/dashboard" className={linkClass('/dashboard')}>
                  {user.role === 'DOCTOR' ? 'Mi agenda' : 'Mis turnos'}
                </Link>
                {user.role === 'DOCTOR' && (
                  <Link to="/doctor/profile" className={linkClass('/doctor/profile')}>Mi perfil</Link>
                )}
                {user.role === 'ADMIN' && (
                  <Link to="/admin" className={linkClass('/admin')}>Admin</Link>
                )}

                <div className="w-px h-5 bg-[var(--color-border)]" aria-hidden="true" />

                <Link
                  to="/settings"
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  title="Ajustes de cuenta"
                >
                  <UserAvatar name={user.name} photoUrl={user.photoUrl} size="sm" />
                  <span className="text-sm text-[var(--color-text-secondary)]">{user.name.split(' ')[0]}</span>
                </Link>
                <button
                  onClick={logout}
                  className="text-sm font-medium text-[var(--color-danger)] hover:text-[var(--color-danger)]/80 transition-colors"
                >
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={linkClass('/login')}>Entrar</Link>
                <Link
                  to="/register"
                  className="text-sm font-medium px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  Registrarse
                </Link>
              </>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="p-2 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-card-hover)] transition-colors"
            >
              {isDark ? (
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile: theme + hamburger */}
          <div className="sm:hidden flex items-center gap-1">
            <button
              onClick={toggleTheme}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="p-2 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-card-hover)]"
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setOpen(!open)}
              className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={open}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {open
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div
            className="sm:hidden mt-3 pt-4 border-t border-[var(--color-border)] flex flex-col gap-1 animate-[fadeIn_150ms_ease-out]"
            role="menu"
          >
            <MobileLink to="/doctors" label="Doctores" active={isActive('/doctors')} />
            {user ? (
              <>
                <MobileLink to="/dashboard" label={user.role === 'DOCTOR' ? 'Mi agenda' : 'Mis turnos'} active={isActive('/dashboard')} />
                {user.role === 'DOCTOR' && <MobileLink to="/doctor/profile" label="Mi perfil" active={isActive('/doctor/profile')} />}
                {user.role === 'ADMIN' && <MobileLink to="/admin" label="Admin" active={isActive('/admin')} />}
                <div className="border-t border-[var(--color-border)] my-2" />
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={user.name} photoUrl={user.photoUrl} size="sm" />
                    <span className="text-sm text-[var(--color-text-secondary)]">{user.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link to="/settings" className="text-sm text-[var(--color-text-secondary)]">Ajustes</Link>
                    <button onClick={logout} className="text-sm font-medium text-[var(--color-danger)]">Salir</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <MobileLink to="/login" label="Entrar" active={isActive('/login')} />
                <div className="px-3 pt-2">
                  <Link
                    to="/register"
                    className="block text-center text-sm font-medium px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
                  >
                    Registrarse
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </nav>
    </>
  );
}

function MobileLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`block px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
        active
          ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-card-hover)] hover:text-[var(--color-text)]'
      }`}
      role="menuitem"
    >
      {label}
    </Link>
  );
}
