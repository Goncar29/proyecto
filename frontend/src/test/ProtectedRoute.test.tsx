import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ProtectedRoute from '@/components/ProtectedRoute';

// Mockeamos useAuth para controlar el estado de autenticación
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Capturamos adónde redirige Navigate
const mockNavigateTo = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => {
      mockNavigateTo(to);
      return null;
    },
  };
});

import { useAuth } from '@/context/AuthContext';

describe('ProtectedRoute', () => {
  afterEach(() => {
    mockNavigateTo.mockClear();
  });

  it('muestra "Cargando..." mientras loading es true', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: true } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <ProtectedRoute><p>Contenido</p></ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    expect(screen.queryByText('Contenido')).not.toBeInTheDocument();
  });

  it('redirige a /login si no hay usuario autenticado', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <ProtectedRoute><p>Privado</p></ProtectedRoute>
      </MemoryRouter>,
    );

    expect(mockNavigateTo).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('Privado')).not.toBeInTheDocument();
  });

  it('muestra los children cuando hay usuario y no se exige rol', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, name: 'Test', role: 'PATIENT' },
      loading: false,
    } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <ProtectedRoute><p>Contenido protegido</p></ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it('redirige a /dashboard si el rol del usuario no está permitido', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, name: 'Test', role: 'PATIENT' },
      loading: false,
    } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <ProtectedRoute roles={['ADMIN']}><p>Solo admin</p></ProtectedRoute>
      </MemoryRouter>,
    );

    expect(mockNavigateTo).toHaveBeenCalledWith('/dashboard');
    expect(screen.queryByText('Solo admin')).not.toBeInTheDocument();
  });

  it('muestra los children cuando el rol del usuario está permitido', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, name: 'Admin User', role: 'ADMIN' },
      loading: false,
    } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <ProtectedRoute roles={['ADMIN']}><p>Panel de admin</p></ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Panel de admin')).toBeInTheDocument();
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });
});
