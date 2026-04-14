import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="text-center py-10 sm:py-16">
      <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">MediConnect</h1>
      <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-8 px-4">Reservá tu cita médica de forma simple y rápida</p>
      <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
        <Link
          to="/doctors"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          Ver doctores
        </Link>
        <Link
          to="/register"
          className="border border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          Crear cuenta
        </Link>
      </div>
    </div>
  );
}
