import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const linkClass = 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white';

  return (
    <>
      {open && <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setOpen(false)} />}
      <nav className="relative z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 transition-colors">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-blue-600">MediConnect</Link>

        {/* Desktop */}
        <div className="hidden sm:flex items-center gap-4">
          <Link to="/doctors" className={linkClass}>Doctores</Link>
          {user ? (
            <>
              <Link to="/dashboard" className={linkClass}>Dashboard</Link>
              {user.role === 'DOCTOR' && <Link to="/doctor/profile" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">Mi perfil</Link>}
              {user.role === 'ADMIN' && <Link to="/admin" className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300">Admin</Link>}
              <span className="text-sm text-gray-500 dark:text-gray-400">{user.name}</span>
              <Link to="/settings" className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Ajustes</Link>
              <button onClick={logout} className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">Salir</button>
            </>
          ) : (
            <>
              <Link to="/login" className={linkClass}>Entrar</Link>
              <Link to="/register" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">Registrarse</Link>
            </>
          )}
          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="sm:hidden flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            aria-label="Menú"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="sm:hidden mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-3">
          <Link to="/doctors" className={linkClass} onClick={() => setOpen(false)}>Doctores</Link>
          {user ? (
            <>
              <Link to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>Dashboard</Link>
              {user.role === 'DOCTOR' && <Link to="/doctor/profile" className="text-blue-600 dark:text-blue-400" onClick={() => setOpen(false)}>Mi perfil</Link>}
              {user.role === 'ADMIN' && <Link to="/admin" className="text-purple-600 dark:text-purple-400" onClick={() => setOpen(false)}>Admin</Link>}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-500 dark:text-gray-400">{user.name}</span>
                <div className="flex items-center gap-3">
                  <Link to="/settings" className="text-sm text-gray-500 dark:text-gray-400" onClick={() => setOpen(false)}>Ajustes</Link>
                  <button onClick={() => { logout(); setOpen(false); }} className="text-sm text-red-600 dark:text-red-400">Salir</button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className={linkClass} onClick={() => setOpen(false)}>Entrar</Link>
              <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm text-center hover:bg-blue-700" onClick={() => setOpen(false)}>Registrarse</Link>
            </>
          )}
        </div>
      )}
    </nav>
    </>
  );
}
