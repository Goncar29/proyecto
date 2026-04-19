/**
 * Tests del reminder cron job.
 *
 * No usamos node-cron directamente — testeamos `runReminderCheck()` con
 * datos reales en la DB de test y el email mockeado.
 */

const prisma  = require('../src/utils/prismaClient');
const { runReminderCheck } = require('../src/jobs/reminderJob');
const { createTestUsers, deleteTestUsers } = require('./helpers/setupUsers');

// Mock del módulo de email — no hacemos llamadas reales a Resend en tests
jest.mock('../src/utils/email', () => ({
    sendAppointmentReminderEmail: jest.fn().mockResolvedValue(true),
    // mantener el resto por si algún otro test lo necesita
    sendPasswordResetEmail:        jest.fn().mockResolvedValue(true),
    sendAppointmentConfirmedEmail: jest.fn().mockResolvedValue(true),
    sendAppointmentCancelledEmail: jest.fn().mockResolvedValue(true),
}));

const { sendAppointmentReminderEmail } = require('../src/utils/email');

let users = {};

// Helper para crear un time block y cita de forma inline
const createApptAt = async (startTime, status = 'CONFIRMED', reminderSentAt = null) => {
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    const tb = await prisma.timeBlock.create({
        data: { doctorId: users.doctor.id, startTime, endTime, date: startTime },
    });
    const appt = await prisma.appointment.create({
        data: {
            date:           startTime,
            patientId:      users.patient.id,
            doctorId:       users.doctor.id,
            timeBlockId:    tb.id,
            status,
            reminderSentAt,
        },
    });
    return { appt, tb };
};

const cleanup = async () => {
    await prisma.appointment.deleteMany({
        where: { OR: [{ patientId: users.patient?.id }, { doctorId: users.doctor?.id }] },
    });
    await prisma.timeBlock.deleteMany({ where: { doctorId: users.doctor?.id } });
};

beforeAll(async () => {
    await deleteTestUsers();
    users = await createTestUsers();
});

beforeEach(async () => {
    sendAppointmentReminderEmail.mockClear();
    await cleanup();
});

afterAll(async () => {
    await cleanup();
    await deleteTestUsers();
    await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('reminderJob — runReminderCheck()', () => {

    it('envía reminder a cita CONFIRMED en ventana 24h y setea reminderSentAt', async () => {
        // Turno exactamente a 24h 5min desde ahora
        const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000 + 5 * 60 * 1000);
        const { appt } = await createApptAt(startTime, 'CONFIRMED');

        await runReminderCheck();

        expect(sendAppointmentReminderEmail).toHaveBeenCalledTimes(1);

        const updated = await prisma.appointment.findUnique({ where: { id: appt.id } });
        expect(updated.reminderSentAt).not.toBeNull();
    });

    it('NO envía reminder si reminderSentAt ya está seteado (idempotente)', async () => {
        const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000 + 5 * 60 * 1000);
        await createApptAt(startTime, 'CONFIRMED', new Date()); // ya enviado

        await runReminderCheck();

        expect(sendAppointmentReminderEmail).not.toHaveBeenCalled();
    });

    it('NO envía reminder a cita PENDING (aunque esté en la ventana)', async () => {
        const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000 + 5 * 60 * 1000);
        await createApptAt(startTime, 'PENDING');

        await runReminderCheck();

        expect(sendAppointmentReminderEmail).not.toHaveBeenCalled();
    });

    it('NO envía reminder a cita CANCELLED', async () => {
        const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000 + 5 * 60 * 1000);
        await createApptAt(startTime, 'CANCELLED');

        await runReminderCheck();

        expect(sendAppointmentReminderEmail).not.toHaveBeenCalled();
    });

    it('NO envía reminder a cita a 30h (fuera de ventana de 24h)', async () => {
        const startTime = new Date(Date.now() + 30 * 60 * 60 * 1000);
        await createApptAt(startTime, 'CONFIRMED');

        await runReminderCheck();

        expect(sendAppointmentReminderEmail).not.toHaveBeenCalled();
    });

    it('NO envía reminder a cita a 2h (pasó la ventana de 24h)', async () => {
        const startTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
        await createApptAt(startTime, 'CONFIRMED');

        await runReminderCheck();

        expect(sendAppointmentReminderEmail).not.toHaveBeenCalled();
    });

    it('si el email falla, NO setea reminderSentAt (se reintentará)', async () => {
        sendAppointmentReminderEmail.mockResolvedValueOnce(false); // fallo simulado

        const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000 + 5 * 60 * 1000);
        const { appt } = await createApptAt(startTime, 'CONFIRMED');

        await runReminderCheck();

        expect(sendAppointmentReminderEmail).toHaveBeenCalledTimes(1);

        const unchanged = await prisma.appointment.findUnique({ where: { id: appt.id } });
        expect(unchanged.reminderSentAt).toBeNull();
    });
});
