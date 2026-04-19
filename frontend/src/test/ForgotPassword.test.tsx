import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ForgotPassword from '@/pages/ForgotPassword';

const mockToast = vi.fn();
const mockApiPost = vi.fn();

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mockeamos el módulo entero para evitar que el fetch real se dispare
vi.mock('@/api/client', () => ({
  api: {
    post: (...args: unknown[]) => mockApiPost(...args),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    postFile: vi.fn(),
  },
}));

describe('ForgotPassword', () => {
  afterEach(() => {
    mockToast.mockClear();
    mockApiPost.mockClear();
  });

  it('renderiza el formulario de email y el botón', () => {
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar link' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Volver a iniciar sesión' })).toBeInTheDocument();
  });

  it('muestra el mensaje de confirmación y el toast tras un submit exitoso', async () => {
    mockApiPost.mockResolvedValueOnce({ message: 'ok' });

    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'user@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));

    await waitFor(() => {
      expect(screen.getByText(/Si el email existe/)).toBeInTheDocument();
    });

    expect(mockToast).toHaveBeenCalledWith('Revisá tu bandeja de entrada', 'success');
    // El formulario ya no debe estar visible
    expect(screen.queryByPlaceholderText('Email')).not.toBeInTheDocument();
  });

  it('muestra toast de error si el submit falla', async () => {
    mockApiPost.mockRejectedValueOnce(new Error('Error de servidor'));

    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'user@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('Error de servidor', 'error');
    });

    // El formulario sigue visible para que el usuario pueda reintentar
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
  });
});
