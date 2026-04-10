import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold text-blue-600">MediConnect</Link>
      <div className="flex items-center gap-4">
        <Link to="/doctors" className="text-gray-600 hover:text-gray-900">Doctores</Link>
        {user ? (
          <>
            <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
            <span className="text-sm text-gray-500">{user.name}</span>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Salir
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-gray-600 hover:text-gray-900">Entrar</Link>
            <Link
              to="/register"
              className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700"
            >
              Registrarse
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
