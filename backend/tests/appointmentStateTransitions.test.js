/**
 * Integration tests for the appointment state machine:
 *   PATCH /api/appointments/:id/confirm
 *   PATCH /api/appointments/:id/complete
 *
 * State rules:
 *   confirm: PENDING  → CONFIRMED  (doctor-owner or admin only)
 *   complete: CONFIRMED → COMPLETED (doctor-owner or admin only)
 */
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');
const { createTestUsers, deleteTestUsers, TEST_PASSWORD } = require('./helpers/setupUsers');

let users = {};
let tokens = {};

const getToken = async (email) => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: TEST_PASSWORD });
    return res.body.token;
};

/**
 * Creates a time block and an appointment with the given status.
 * The appointment is assigned to users.doctor by default.
 */
const makeAppointment = async (status = 'PENDING') => {
    const start = new Date(Date.now() + Math.random() * 10 * 24 * 3600 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const date = new Date(start);
    date.setUTCHours(0, 0, 0, 0);

    const tb = await prisma.timeBlock.create({
        data: { doctorId: users.doctor.id, date, startTime: start, endTime: end },
    });

    return prisma.appointment.create({
        data: {
            patient: { connect: { id: users.patient.id } },
            doctor: { connect: { id: users.doctor.id } },
            timeBlock: { connect: { id: tb.id } },
            status,
            date,
        },
    });
};

beforeAll(async () => {
    await deleteTestUsers();
    users = await createTestUsers();
    tokens.patient = await getToken(users.patient.email);
    tokens.doctor = await getToken(users.doctor.email);
    tokens.admin = await getToken(users.admin.email);
});

afterAll(async () => {
    await prisma.appointment.deleteMany({
        where: { OR: [{ patientId: users.patient?.id }, { doctorId: users.doctor?.id }] },
    });
    await prisma.timeBlock.deleteMany({ where: { doctorId: users.doctor?.id } });
    await deleteTestUsers();
    await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// PATCH /api/appointments/:id/confirm
// ---------------------------------------------------------------------------
describe('PATCH /api/appointments/:id/confirm', () => {
    it('doctor-owner confirms a PENDING appointment → 200 CONFIRMED', async () => {
        const appt = await makeAppointment('PENDING');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/confirm`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({});
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('CONFIRMED');
    });

    it('admin confirms a PENDING appointment → 200 CONFIRMED', async () => {
        const appt = await makeAppointment('PENDING');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/confirm`)
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({});
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('CONFIRMED');
    });

    it('confirm stores optional notes', async () => {
        const appt = await makeAppointment('PENDING');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/confirm`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({ notes: 'Traer estudios previos' });
        expect(res.status).toBe(200);
        expect(res.body.notes).toBe('Traer estudios previos');
    });

    it('patient cannot confirm → 403', async () => {
        const appt = await makeAppointment('PENDING');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/confirm`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({});
        expect(res.status).toBe(403);
    });

    it('cannot confirm a CONFIRMED appointment → 409', async () => {
        const appt = await makeAppointment('CONFIRMED');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/confirm`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({});
        expect(res.status).toBe(409);
    });

    it('cannot confirm a CANCELLED appointment → 409', async () => {
        const appt = await makeAppointment('CANCELLED');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/confirm`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({});
        expect(res.status).toBe(409);
    });

    it('cannot confirm a COMPLETED appointment → 409', async () => {
        const appt = await makeAppointment('COMPLETED');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/confirm`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({});
        expect(res.status).toBe(409);
    });

    it('notes exceeding 500 chars → 400', async () => {
        const appt = await makeAppointment('PENDING');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/confirm`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({ notes: 'x'.repeat(501) });
        expect(res.status).toBe(400);
    });

    it('404 for unknown appointment id', async () => {
        const res = await request(app)
            .patch('/api/appointments/99999999/confirm')
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({});
        expect(res.status).toBe(404);
    });

    it('401 without token', async () => {
        const appt = await makeAppointment('PENDING');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/confirm`)
            .send({});
        expect(res.status).toBe(401);
    });
});

// ---------------------------------------------------------------------------
// PATCH /api/appointments/:id/complete
// ---------------------------------------------------------------------------
describe('PATCH /api/appointments/:id/complete', () => {
    it('doctor-owner completes a CONFIRMED appointment → 200 COMPLETED', async () => {
        const appt = await makeAppointment('CONFIRMED');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/complete`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({});
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('COMPLETED');
    });

    it('admin completes a CONFIRMED appointment → 200 COMPLETED', async () => {
        const appt = await makeAppointment('CONFIRMED');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/complete`)
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({});
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('COMPLETED');
    });

    it('complete stores optional notes', async () => {
        const appt = await makeAppointment('CONFIRMED');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/complete`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({ notes: 'Consulta finalizada sin novedades' });
        expect(res.status).toBe(200);
        expect(res.body.notes).toBe('Consulta finalizada sin novedades');
    });

    it('patient cannot complete → 403', async () => {
        const appt = await makeAppointment('CONFIRMED');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/complete`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({});
        expect(res.status).toBe(403);
    });

    it('cannot complete a PENDING appointment → 409', async () => {
        const appt = await makeAppointment('PENDING');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/complete`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({});
        expect(res.status).toBe(409);
    });

    it('cannot complete a CANCELLED appointment → 409', async () => {
        const appt = await makeAppointment('CANCELLED');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/complete`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({});
        expect(res.status).toBe(409);
    });

    it('cannot complete an already COMPLETED appointment → 409', async () => {
        const appt = await makeAppointment('COMPLETED');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/complete`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({});
        expect(res.status).toBe(409);
    });

    it('notes exceeding 500 chars → 400', async () => {
        const appt = await makeAppointment('CONFIRMED');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/complete`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({ notes: 'x'.repeat(501) });
        expect(res.status).toBe(400);
    });

    it('404 for unknown appointment id', async () => {
        const res = await request(app)
            .patch('/api/appointments/99999999/complete')
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({});
        expect(res.status).toBe(404);
    });

    it('401 without token', async () => {
        const appt = await makeAppointment('CONFIRMED');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/complete`)
            .send({});
        expect(res.status).toBe(401);
    });
});
