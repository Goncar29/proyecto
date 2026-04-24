import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ConfirmModal from '@/components/ConfirmModal';

describe('ConfirmModal', () => {
  const defaultProps = {
    title: 'Cancelar cita',
    message: '¿Estás seguro de que querés cancelar esta cita?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  afterEach(() => {
    defaultProps.onConfirm.mockClear();
    defaultProps.onCancel.mockClear();
  });

  it('renderiza título, mensaje y los dos botones', () => {
    render(<ConfirmModal {...defaultProps} />);

    expect(screen.getByText('Cancelar cita')).toBeInTheDocument();
    expect(screen.getByText('¿Estás seguro de que querés cancelar esta cita?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument();
  });

  it('usa labels personalizados cuando se proveen', () => {
    render(
      <ConfirmModal
        {...defaultProps}
        confirmLabel="Sí, cancelar"
        cancelLabel="No, volver"
      />,
    );

    expect(screen.getByRole('button', { name: 'Sí, cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No, volver' })).toBeInTheDocument();
  });

  it('llama onConfirm al clickar el botón de confirmación', () => {
    render(<ConfirmModal {...defaultProps} confirmLabel="Sí, cancelar" />);
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('llama onCancel al clickar el botón de cancelar', () => {
    render(<ConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('llama onCancel al clickar el backdrop (fuera del modal)', () => {
    render(<ConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('NO llama onCancel al clickar dentro del contenido del modal', () => {
    render(<ConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancelar cita'));
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('tiene atributos de accesibilidad correctos', () => {
    render(<ConfirmModal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-modal-title');
  });
});
