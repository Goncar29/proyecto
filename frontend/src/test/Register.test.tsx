import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Register from '@/pages/Register';

const mockNavigate = vi.fn();
const mockRegister = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    user: null,
    token: null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const fillForm = (name = 'Juan Pérez', email = 'juan@test.com', password = 'password123') => {
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } });
};

describe('Register', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockRegister.mockClear();
  });

  it('renderiza los tres campos y el botón de submit', () => {
    render(<MemoryRouter><Register /></MemoryRouter>);

    expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('muestra el link para ir a login', () => {
    render(<MemoryRouter><Register /></MemoryRouter>);

    const link = screen.getByRole('link', { name: 'Iniciá sesión' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/login');
  });

  it('navega a / tras un registro exitoso', async () => {
    mockRegister.mockResolvedValueOnce(undefined);
    render(<MemoryRouter><Register /></MemoryRouter>);

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('Juan Pérez', 'juan@test.com', 'password123');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('muestra el error si el registro falla', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Ya existe una cuenta con ese email.'));
    render(<MemoryRouter><Register /></MemoryRouter>);

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Ya existe una cuenta con ese email.');
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('el botón muestra "Creando..." y queda deshabilitado durante el submit', async () => {
    mockRegister.mockReturnValueOnce(new Promise(() => {}));
    render(<MemoryRouter><Register /></MemoryRouter>);

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Creando...' })).toBeDisabled();
    });
  });

  it('muestra el indicador de fortaleza débil para contraseñas cortas', () => {
    render(<MemoryRouter><Register /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'abc' } });
    expect(screen.getByText('Débil')).toBeInTheDocument();
  });

  it('muestra el indicador de fortaleza aceptable para contraseñas de 8-11 caracteres', () => {
    render(<MemoryRouter><Register /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password1' } });
    expect(screen.getByText('Aceptable')).toBeInTheDocument();
  });

  it('muestra el indicador de fortaleza fuerte para contraseñas de 12+ caracteres', () => {
    render(<MemoryRouter><Register /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123456' } });
    expect(screen.getByText('Fuerte')).toBeInTheDocument();
  });

  it('no muestra el indicador de fortaleza si la contraseña está vacía', () => {
    render(<MemoryRouter><Register /></MemoryRouter>);

    expect(screen.queryByText('Débil')).not.toBeInTheDocument();
    expect(screen.queryByText('Aceptable')).not.toBeInTheDocument();
    expect(screen.queryByText('Fuerte')).not.toBeInTheDocument();
  });
});
