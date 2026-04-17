import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { useToast } from '@/context/ToastContext';

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post<{ message: string }>('/auth/forgot-password', { email });
      setSent(true);
      toast('Revisá tu bandeja de entrada', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error al enviar el link', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">¿Olvidaste tu contraseña?</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Ingresá tu email y te mandamos un link para elegir una nueva contraseña.
      </p>

      {sent ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-4 rounded-lg mb-4">
          <p className="font-medium mb-1">Si el email existe, te llegará un link.</p>
          <p className="text-sm">Revisá tu bandeja de entrada (y spam). El link expira en 30 minutos.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar link'}
          </button>
        </form>
      )}

      <p className="mt-4 text-gray-600 dark:text-gray-400">
        <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">← Volver a iniciar sesión</Link>
      </p>
    </div>
  );
}
