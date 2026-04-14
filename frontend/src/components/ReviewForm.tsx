import { useState } from 'react';
import { api } from '@/api/client';

interface Props {
  doctorId: number;
  appointmentId: number;
  onSuccess: () => void;
}

export default function ReviewForm({ doctorId, appointmentId, onSuccess }: Props) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post(`/doctors/${doctorId}/reviews`, { appointmentId, rating, text: text || undefined });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 dark:text-gray-400">Rating:</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`text-xl ${n <= rating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <textarea
        placeholder="Comentario (opcional)"
        value={text}
        onChange={e => setText(e.target.value)}
        maxLength={2000}
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Enviando...' : 'Enviar review'}
      </button>
    </form>
  );
}
