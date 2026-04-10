import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, loading, logout } = useAuth();

  if (loading) return <p style={{ padding: '2rem' }}>Cargando...</p>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <main style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1>Dashboard</h1>
      <p>Bienvenido, {user.name} ({user.role})</p>
      <button onClick={logout}>Cerrar sesión</button>
    </main>
  );
}
