import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="text-center py-16">
      <h1 className="text-5xl font-bold text-gray-900 mb-4">MediConnect</h1>
      <p className="text-xl text-gray-600 mb-8">Reservá tu cita médica de forma simple y rápida</p>
      <div className="flex justify-center gap-4">
        <Link
          to="/doctors"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          Ver doctores
        </Link>
        <Link
          to="/register"
          className="border border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50"
        >
          Crear cuenta
        </Link>
      </div>
    </div>
  );
}
