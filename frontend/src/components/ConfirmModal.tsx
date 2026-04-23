interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Volver',
  variant = 'danger',
  onConfirm,
  onCancel,
}: Props) {
  const confirmColors =
    variant === 'danger'
      ? 'bg-[var(--color-danger)] hover:opacity-90 text-white'
      : 'bg-[var(--color-warning)] hover:opacity-90 text-white';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="rounded-[var(--radius-2xl)] bg-[var(--color-card)] max-w-sm w-full mx-4 p-6 animate-[fadeInUp_200ms_ease-out]"
        style={{ boxShadow: 'var(--shadow-card-hover)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3
          id="confirm-modal-title"
          className="text-lg font-semibold text-[var(--color-text)] mb-2"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {title}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-card-hover)] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold rounded-[var(--radius-md)] transition-opacity ${confirmColors}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
