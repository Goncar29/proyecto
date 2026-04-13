import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const linkClass = 'text-gray-600 hover:text-gray-900';

  return (
    <>
      {open && <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setOpen(false)} />}
      <nav className="relative z-50 bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-blue-600">MediConnect</Link>

        {/* Desktop */}
        <div className="hidden sm:flex items-center gap-4">
          <Link to="/doctors" className={linkClass}>Doctores</Link>
          {user ? (
            <>
              <Link to="/dashboard" className={linkClass}>Dashboard</Link>
              {user.role === 'ADMIN' && <Link to="/admin" className="text-purple-600 hover:text-purple-800">Admin</Link>}
              <span className="text-sm text-gray-500">{user.name}</span>
              <button onClick={logout} className="text-sm text-red-600 hover:text-red-800">Salir</button>
            </>
          ) : (
            <>
              <Link to="/login" className={linkClass}>Entrar</Link>
              <Link to="/register" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">Registrarse</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="sm:hidden p-2 text-gray-600 hover:text-gray-900"
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

      {/* Mobile menu */}
      {open && (
        <div className="sm:hidden mt-3 pt-3 border-t border-gray-100 flex flex-col gap-3">
          <Link to="/doctors" className={linkClass} onClick={() => setOpen(false)}>Doctores</Link>
          {user ? (
            <>
              <Link to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>Dashboard</Link>
              {user.role === 'ADMIN' && <Link to="/admin" className="text-purple-600 hover:text-purple-800" onClick={() => setOpen(false)}>Admin</Link>}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-sm text-gray-500">{user.name}</span>
                <button onClick={() => { logout(); setOpen(false); }} className="text-sm text-red-600 hover:text-red-800">Salir</button>
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
