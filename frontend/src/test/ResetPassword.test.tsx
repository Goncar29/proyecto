import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import ResetPassword from '@/pages/ResetPassword';

const mockNavigate = vi.fn();
const mockApiPost  = vi.fn();
const mockToast    = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/api/client', () => ({
  api: { post: (...args: unknown[]) => mockApiPost(...args), get: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), postFile: vi.fn() },
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const renderWithToken = (token = 'valid-token') =>
  render(
    <MemoryRouter initialEntries={[`/reset-password?token=${token}`]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </MemoryRouter>,
  );

afterEach(() => {
  mockNavigate.mockClear();
  mockApiPost.mockClear();
  mockToast.mockClear();
});

describe('ResetPassword', () => {
  it('renderiza los dos campos de contraseña y el botón', () => {
    renderWithToken();
    expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeInTheDocument();
  });

  it('redirige a /login si no hay token en la URL', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <Routes><Route path="/reset-password" element={<ResetPassword />} /></Routes>
      </MemoryRouter>,
    );
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('muestra error si la contraseña tiene menos de 8 caracteres', async () => {
    renderWithToken();
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'corta' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'corta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña debe tener al menos 8 caracteres.');
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('muestra error si las contraseñas no coinciden', async () => {
    renderWithToken();
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'diferente123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Las contraseñas no coinciden.');
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('navega a /login con toast de éxito tras cambio correcto', async () => {
    mockApiPost.mockResolvedValueOnce({ message: 'ok' });
    renderWithToken();

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'nuevapass123' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'nuevapass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/auth/reset-password', { token: 'valid-token', newPassword: 'nuevapass123' });
      expect(mockToast).toHaveBeenCalledWith('Contraseña actualizada. Iniciá sesión con la nueva.', 'success');
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  it('muestra pantalla de link expirado si el backend devuelve INVALID_TOKEN', async () => {
    const err = Object.assign(new Error('Token inválido'), { code: 'INVALID_TOKEN' });
    mockApiPost.mockRejectedValueOnce(err);
    renderWithToken();

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'nuevapass123' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'nuevapass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByText('Link inválido o expirado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir un link nuevo' })).toHaveAttribute('href', '/forgot-password');
  });

  it('muestra error genérico para otros fallos del servidor', async () => {
    mockApiPost.mockRejectedValueOnce(new Error('Error de servidor'));
    renderWithToken();

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'nuevapass123' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'nuevapass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Error de servidor');
  });
});
