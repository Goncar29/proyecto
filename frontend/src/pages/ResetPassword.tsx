import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { useToast } from '@/context/ToastContext';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await api.post<{ message: string }>('/auth/reset-password', {
        token,
        newPassword: password,
      });
      toast('Contraseña actualizada. Iniciá sesión con la nueva.', 'success');
      navigate('/login', { replace: true });
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === 'INVALID_TOKEN') {
        setExpired(true);
      } else {
        setError(e.message || 'Error al cambiar la contraseña.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (expired) {
    return (
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Link inválido o expirado</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          El link ya fue usado o venció (válido por 30 minutos).
        </p>
        <Link
          to="/forgot-password"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
        >
          Pedir un link nuevo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Nueva contraseña</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Elegí una contraseña nueva para tu cuenta.
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="Nueva contraseña (mín. 8 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        <input
          type="password"
          placeholder="Confirmar contraseña"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  );
}
