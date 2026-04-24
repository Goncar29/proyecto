import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Settings from '@/pages/Settings';

const mockApiPut   = vi.fn();
const mockApiPatch = vi.fn();
const mockToast    = vi.fn();
const mockRefreshUser = vi.fn();

vi.mock('@/api/client', () => ({
  api: {
    put:      (...args: unknown[]) => mockApiPut(...args),
    patch:    (...args: unknown[]) => mockApiPatch(...args),
    get:      vi.fn(),
    post:     vi.fn(),
    delete:   vi.fn(),
    postFile: vi.fn(),
  },
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Ana García', email: 'ana@test.com', role: 'PATIENT' as const },
    refreshUser: mockRefreshUser,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const renderSettings = () => render(<MemoryRouter><Settings /></MemoryRouter>);

afterEach(() => {
  mockApiPut.mockReset();
  mockApiPatch.mockReset();
  mockToast.mockClear();
  mockRefreshUser.mockClear();
});

// ── Datos personales ──────────────────────────────────────────────────────────

describe('Settings — datos personales', () => {
  it('pre-rellena los campos con los datos del usuario', () => {
    renderSettings();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana García');
    expect(screen.getByLabelText('Email')).toHaveValue('ana@test.com');
  });

  it('el botón Guardar está deshabilitado si no hay cambios', () => {
    renderSettings();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('el botón Guardar se habilita al modificar el nombre', async () => {
    renderSettings();
    // Esperar que el useEffect rellene los campos
    await waitFor(() => expect(screen.getByLabelText('Nombre')).toHaveValue('Ana García'));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana López' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar cambios' })).not.toBeDisabled());
  });

  it('muestra error si el nombre tiene menos de 2 caracteres', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByLabelText('Nombre')).toHaveValue('Ana García'));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El nombre debe tener al menos 2 caracteres.');
    expect(mockApiPut).not.toHaveBeenCalled();
  });

  it('guarda los datos correctamente y muestra toast de éxito', async () => {
    mockApiPut.mockResolvedValueOnce({});
    mockRefreshUser.mockResolvedValueOnce(undefined);
    renderSettings();

    await waitFor(() => expect(screen.getByLabelText('Nombre')).toHaveValue('Ana García'));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana López' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith('/users/1', { name: 'Ana López', email: 'ana@test.com' });
      expect(mockRefreshUser).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Datos actualizados con éxito.', 'success');
    });
  });

  it('muestra error si el servidor falla al guardar perfil', async () => {
    mockApiPut.mockRejectedValueOnce(new Error('Email ya en uso'));
    renderSettings();

    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveValue('ana@test.com'));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'otro@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email ya en uso');
  });
});

// ── Cambiar contraseña ────────────────────────────────────────────────────────

describe('Settings — cambiar contraseña', () => {
  it('muestra error si la nueva contraseña tiene menos de 8 caracteres', async () => {
    renderSettings();
    fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'actual123' } });
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'corta' } });
    fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'corta' } });
    fireEvent.submit(screen.getByLabelText('Nueva contraseña').closest('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent('La nueva contraseña debe tener al menos 8 caracteres.');
    expect(mockApiPatch).not.toHaveBeenCalled();
  });

  it('muestra error si las contraseñas nuevas no coinciden', async () => {
    renderSettings();
    fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'actual123' } });
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'nueva12345' } });
    fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'diferente' } });
    fireEvent.submit(screen.getByLabelText('Nueva contraseña').closest('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent('Las contraseñas nuevas no coinciden.');
    expect(mockApiPatch).not.toHaveBeenCalled();
  });

  it('cambia la contraseña correctamente y muestra toast de éxito', async () => {
    mockApiPatch.mockResolvedValueOnce({ message: 'ok' });
    renderSettings();

    fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'actual123' } });
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'nueva12345' } });
    fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'nueva12345' } });
    fireEvent.submit(screen.getByLabelText('Nueva contraseña').closest('form')!);

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledWith('/users/me/password', { currentPassword: 'actual123', newPassword: 'nueva12345' });
      expect(mockToast).toHaveBeenCalledWith('Contraseña actualizada con éxito.', 'success');
    });
  });

  it('muestra error específico cuando la contraseña actual es incorrecta', async () => {
    mockApiPatch.mockRejectedValueOnce(Object.assign(new Error('err'), { code: 'WRONG_CURRENT_PASSWORD' }));
    renderSettings();

    fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'incorrecta' } });
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'nueva12345' } });
    fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'nueva12345' } });
    fireEvent.submit(screen.getByLabelText('Nueva contraseña').closest('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña actual es incorrecta.');
  });

  it('muestra error específico cuando la nueva contraseña es igual a la actual', async () => {
    mockApiPatch.mockRejectedValueOnce(Object.assign(new Error('err'), { code: 'SAME_PASSWORD' }));
    renderSettings();

    fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'mismapass' } });
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'mismapass' } });
    fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'mismapass' } });
    fireEvent.submit(screen.getByLabelText('Nueva contraseña').closest('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent('La nueva contraseña debe ser diferente a la actual.');
  });
});
