import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1>MediConnect</h1>
      <p>Plataforma de reservas médicas</p>
      <nav style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <Link to="/doctors">Ver doctores</Link>
        <Link to="/login">Iniciar sesión</Link>
        <Link to="/register">Registrarse</Link>
      </nav>
    </main>
  );
}
