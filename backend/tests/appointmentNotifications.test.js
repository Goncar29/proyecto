/**
 * Tests de notificaciones por email en confirm/cancel de turnos.
 * Mockea Resend para no hacer llamadas de red.
 */

jest.mock('../src/utils/email', () => ({
    sendPasswordResetEmail:      jest.fn().mockResolvedValue(true),
    sendAppointmentConfirmedEmail: jest.fn().mockResolvedValue(true),
    sendAppointmentCancelledEmail: jest.fn().mockResolvedValue(true),
}));

const request = require('supertest');
const app     = require('../src/app');
const prisma  = require('../src/utils/prismaClient');
const { createTestUsers, deleteTestUsers, TEST_PASSWORD } = require('./helpers/setupUsers');
const { sendAppointmentConfirmedEmail, sendAppointmentCancelledEmail } = require('../src/utils/email');

let users  = {};
let tokens = {};
let timeBlock, appointment;

const login = async (email) => {
    const res = await request(app).post('/api/auth/login').send({ email, password: TEST_PASSWORD });
    return res.body.token;
};

const cleanup = async () => {
    if (appointment) await prisma.appointment.deleteMany({ where: { id: appointment.id } }).catch(() => {});
    if (timeBlock)   await prisma.timeBlock.deleteMany({ where: { id: timeBlock.id } }).catch(() => {});
};

beforeAll(async () => {
    await deleteTestUsers();
    users = await createTestUsers();
    tokens.patient = await login(users.patient.email);
    tokens.doctor  = await login(users.doctor.email);
});

afterAll(async () => {
    await cleanup();
    await deleteTestUsers();
    await prisma.$disconnect();
});

beforeEach(async () => {
    await cleanup();
    sendAppointmentConfirmedEmail.mockClear();
    sendAppointmentCancelledEmail.mockClear();

    // Crear un timeBlock y una reserva frescos para cada test
    const startTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const endTime   = new Date(startTime.getTime() + 60 * 60 * 1000);

    timeBlock = await prisma.timeBlock.create({
        data: { doctorId: users.doctor.id, startTime, endTime, date: startTime },
    });

    const res = await request(app)
        .post(`/api/users/${users.patient.id}/reservations`)
        .set('Authorization', `Bearer ${tokens.patient}`)
        .send({ timeBlockId: timeBlock.id, doctorId: users.doctor.id });

    expect(res.status).toBe(201);
    appointment = res.body;
});

describe('PATCH /api/appointments/:id/confirm — notificaciones', () => {
    it('confirmar un turno → llama sendAppointmentConfirmedEmail con datos del paciente', async () => {
        const res = await request(app)
            .patch(`/api/appointments/${appointment.id}/confirm`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({});

        expect(res.status).toBe(200);

        // Esperar el fire-and-forget (microtask)
        await new Promise(r => setImmediate(r));

        expect(sendAppointmentConfirmedEmail).toHaveBeenCalledTimes(1);
        const [args] = sendAppointmentConfirmedEmail.mock.calls;
        expect(args[0].patientEmail).toBe(users.patient.email);
        expect(args[0].patientName).toBe(users.patient.name);
        expect(args[0].doctorName).toBe(users.doctor.name);
        expect(args[0].startTime).toBeDefined();
    });

    it('cancelar NO llama sendAppointmentConfirmedEmail', async () => {
        await request(app)
            .patch(`/api/appointments/${appointment.id}/cancel`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({});

        await new Promise(r => setImmediate(r));
        expect(sendAppointmentConfirmedEmail).not.toHaveBeenCalled();
    });
});

describe('PATCH /api/appointments/:id/cancel — notificaciones', () => {
    it('doctor cancela → notifica al paciente', async () => {
        const res = await request(app)
            .patch(`/api/appointments/${appointment.id}/cancel`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({ reason: 'Emergencia médica' });

        expect(res.status).toBe(200);
        await new Promise(r => setImmediate(r));

        expect(sendAppointmentCancelledEmail).toHaveBeenCalledTimes(1);
        const [args] = sendAppointmentCancelledEmail.mock.calls;
        expect(args[0].toEmail).toBe(users.patient.email);
        expect(args[0].toName).toBe(users.patient.name);
        expect(args[0].otherPartyName).toBe(users.doctor.name);
        expect(args[0].cancelledBy).toBe('doctor');
    });

    it('paciente cancela → notifica al doctor', async () => {
        const res = await request(app)
            .patch(`/api/appointments/${appointment.id}/cancel`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({});

        expect(res.status).toBe(200);
        await new Promise(r => setImmediate(r));

        expect(sendAppointmentCancelledEmail).toHaveBeenCalledTimes(1);
        const [args] = sendAppointmentCancelledEmail.mock.calls;
        expect(args[0].toEmail).toBe(users.doctor.email);
        expect(args[0].toName).toBe(users.doctor.name);
        expect(args[0].otherPartyName).toBe(users.patient.name);
        expect(args[0].cancelledBy).toBe('patient');
    });
});
