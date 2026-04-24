import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Dashboard from '@/pages/Dashboard';
import type { Appointment, PaginatedResponse } from '@/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockApiGet = vi.fn();
const mockApiPatch = vi.fn();

vi.mock('@/api/client', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    patch: (...args: unknown[]) => mockApiPatch(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    postFile: vi.fn(),
  },
}));

const mockToast = vi.fn();
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUseAuth = vi.fn();

// ── Fixtures ─────────────────────────────────────────────────────────────────

const futureTime = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
const pastTime   = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

const makeAppointment = (overrides: Partial<Appointment> = {}): Appointment => ({
  id: 1,
  patientId: 10,
  doctorId: 20,
  timeBlockId: 100,
  date: futureTime,
  status: 'PENDING',
  patient: { id: 10, name: 'Ana García' },
  doctor: { id: 20, name: 'Dr. Martínez' },
  timeBlock: { id: 100, doctorId: 20, startTime: futureTime, endTime: futureTime, date: futureTime },
  ...overrides,
});

const emptyPage: PaginatedResponse<Appointment> = { items: [], total: 0, page: 1, pageSize: 10 };

const onePage = (appt: Appointment): PaginatedResponse<Appointment> => ({
  items: [appt],
  total: 1,
  page: 1,
  pageSize: 10,
});

const patientUser = { id: 10, name: 'Ana García', role: 'PATIENT' as const, email: 'ana@test.com' };
const doctorUser  = { id: 20, name: 'Dr. Martínez', role: 'DOCTOR' as const, email: 'dr@test.com' };

// ── Helpers ───────────────────────────────────────────────────────────────────

const renderDashboard = () =>
  render(<MemoryRouter><Dashboard /></MemoryRouter>);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Dashboard — paciente', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: patientUser });
    mockApiGet.mockResolvedValue(emptyPage);
  });

  afterEach(() => {
    mockApiGet.mockReset();
    mockApiPatch.mockReset();
    mockToast.mockClear();
  });

  it('muestra "Mis turnos" como título para pacientes', async () => {
    renderDashboard();
    expect(await screen.findByText('Mis turnos')).toBeInTheDocument();
  });

  it('muestra las dos tabs: Próximas e Historial', async () => {
    renderDashboard();
    expect(await screen.findByRole('button', { name: 'Próximas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Historial' })).toBeInTheDocument();
  });

  it('muestra mensaje vacío cuando no hay citas próximas', async () => {
    renderDashboard();
    expect(await screen.findByText('No tenés citas próximas.')).toBeInTheDocument();
  });

  it('muestra botón Cancelar y Reprogramar para cita PENDING', async () => {
    mockApiGet.mockResolvedValue(onePage(makeAppointment({ status: 'PENDING' })));
    renderDashboard();

    expect(await screen.findByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reprogramar' })).toBeInTheDocument();
  });

  it('NO muestra Confirmar ni Completar para el paciente', async () => {
    mockApiGet.mockResolvedValue(onePage(makeAppointment({ status: 'PENDING' })));
    renderDashboard();

    await screen.findByRole('button', { name: 'Cancelar' });
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Completar' })).not.toBeInTheDocument();
  });

  it('muestra "Dejar review" para citas COMPLETED', async () => {
    mockApiGet.mockResolvedValue(onePage(makeAppointment({ status: 'COMPLETED', date: pastTime })));
    renderDashboard();

    expect(await screen.findByRole('button', { name: 'Dejar review' })).toBeInTheDocument();
  });

  it('abre el modal de cancelación al clickar Cancelar', async () => {
    mockApiGet.mockResolvedValue(onePage(makeAppointment({ status: 'PENDING' })));
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Cancelar cita')).toBeInTheDocument();
  });

  it('cierra el modal al clickar Volver', async () => {
    mockApiGet.mockResolvedValue(onePage(makeAppointment({ status: 'PENDING' })));
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('cancela la cita y actualiza el estado local al confirmar en el modal', async () => {
    mockApiGet.mockResolvedValue(onePage(makeAppointment({ status: 'PENDING' })));
    mockApiPatch.mockResolvedValue({});
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }));

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledWith('/appointments/1/cancel');
      expect(mockToast).toHaveBeenCalledWith('Cita cancelada', 'success');
    });
  });

  it('muestra mensaje de error si la cancelación falla', async () => {
    mockApiGet.mockResolvedValue(onePage(makeAppointment({ status: 'PENDING' })));
    mockApiPatch.mockRejectedValue(new Error('No autorizado'));
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('No autorizado', 'error');
    });
  });
});

describe('Dashboard — doctor', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: doctorUser });
    // /public/doctors/:id para el perfil + /appointments para las citas
    mockApiGet.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/public/doctors')) {
        return Promise.resolve({
          specialty: 'Cardiología',
          hospital: 'Hospital Central',
          location: 'Buenos Aires',
          bio: null,
          photoUrl: null,
        });
      }
      return Promise.resolve(emptyPage);
    });
  });

  afterEach(() => {
    mockApiGet.mockReset();
    mockApiPatch.mockReset();
    mockToast.mockClear();
  });

  it('muestra "Mi agenda" como título para doctores', async () => {
    renderDashboard();
    expect(await screen.findByText('Mi agenda')).toBeInTheDocument();
  });

  it('muestra botón Confirmar para citas PENDING del doctor', async () => {
    mockApiGet.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/public/doctors')) return Promise.resolve({ specialty: 'Cardiología', hospital: null, location: null, bio: null, photoUrl: null });
      return Promise.resolve(onePage(makeAppointment({ status: 'PENDING', doctorId: 20 })));
    });
    renderDashboard();

    expect(await screen.findByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
  });

  it('muestra botón Completar para citas CONFIRMED del doctor', async () => {
    mockApiGet.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/public/doctors')) return Promise.resolve({ specialty: 'Cardiología', hospital: null, location: null, bio: null, photoUrl: null });
      return Promise.resolve(onePage(makeAppointment({ status: 'CONFIRMED', doctorId: 20 })));
    });
    renderDashboard();

    expect(await screen.findByRole('button', { name: 'Completar' })).toBeInTheDocument();
  });

  it('NO muestra Reprogramar para el doctor', async () => {
    mockApiGet.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/public/doctors')) return Promise.resolve({ specialty: 'Cardiología', hospital: null, location: null, bio: null, photoUrl: null });
      return Promise.resolve(onePage(makeAppointment({ status: 'PENDING', doctorId: 20 })));
    });
    renderDashboard();

    await screen.findByRole('button', { name: 'Confirmar' });
    expect(screen.queryByRole('button', { name: 'Reprogramar' })).not.toBeInTheDocument();
  });

  it('confirma la cita y muestra toast de éxito', async () => {
    mockApiGet.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/public/doctors')) return Promise.resolve({ specialty: 'Cardiología', hospital: null, location: null, bio: null, photoUrl: null });
      return Promise.resolve(onePage(makeAppointment({ status: 'PENDING', doctorId: 20 })));
    });
    mockApiPatch.mockResolvedValue({});
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledWith('/appointments/1/confirm');
      expect(mockToast).toHaveBeenCalledWith('Cita confirmada', 'success');
    });
  });
});

describe('Dashboard — tabs', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: patientUser });
    mockApiGet.mockResolvedValue(emptyPage);
  });

  afterEach(() => {
    mockApiGet.mockReset();
  });

  it('al cambiar a Historial hace fetch con status=CANCELLED,COMPLETED', async () => {
    renderDashboard();
    await screen.findByText('No tenés citas próximas.');

    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));

    await waitFor(() => {
      const lastCall = mockApiGet.mock.calls[mockApiGet.mock.calls.length - 1][0] as string;
      expect(lastCall).toContain('status=CANCELLED%2CCOMPLETED');
    });
  });

  it('muestra "No tenés citas en el historial." cuando el historial está vacío', async () => {
    renderDashboard();
    await screen.findByText('No tenés citas próximas.');

    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));

    expect(await screen.findByText('No tenés citas en el historial.')).toBeInTheDocument();
  });
});
