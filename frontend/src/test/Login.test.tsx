import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Login from '@/pages/Login';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();
const mockToast = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams()],
  };
});

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    token: null,
    loading: false,
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Login', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockLogin.mockClear();
    mockToast.mockClear();
  });

  it('renderiza los campos de email y contraseña', () => {
    render(<MemoryRouter><Login /></MemoryRouter>);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('muestra el link "Olvidé mi contraseña"', () => {
    render(<MemoryRouter><Login /></MemoryRouter>);

    const link = screen.getByRole('link', { name: 'Olvidé mi contraseña' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/forgot-password');
  });

  it('navega a /dashboard tras un login exitoso', async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    render(<MemoryRouter><Login /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'password123');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('muestra el mensaje de error si el login falla', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Credenciales inválidas'));

    render(<MemoryRouter><Login /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('el botón muestra "Entrando..." y queda deshabilitado mientras procesa el submit', async () => {
    mockLogin.mockReturnValueOnce(new Promise(() => {}));

    render(<MemoryRouter><Login /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Entrando...' })).toBeDisabled();
    });
  });
});
