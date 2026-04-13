/**
 * Integration tests for PATCH /api/appointments/:id/cancel.
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

const makeAppointment = async (status = 'CONFIRMED') => {
    const start = new Date(Date.now() + Math.random() * 10 * 24 * 3600 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const date = new Date(start); date.setUTCHours(0, 0, 0, 0);
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

describe('PATCH /api/appointments/:id/cancel', () => {
    it('patient owner cancels successfully and slot becomes free', async () => {
        const appt = await makeAppointment('CONFIRMED');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/cancel`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ reason: 'conflict' });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('CANCELLED');
        expect(res.body.reason).toBe('conflict');
    });

    it('doctor owner can cancel', async () => {
        const appt = await makeAppointment('CONFIRMED');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/cancel`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({});
        expect(res.status).toBe(200);
    });

    it('admin can cancel', async () => {
        const appt = await makeAppointment('CONFIRMED');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/cancel`)
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({});
        expect(res.status).toBe(200);
    });

    it('cannot cancel a COMPLETED appointment → 409', async () => {
        const appt = await makeAppointment('COMPLETED');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/cancel`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({});
        expect(res.status).toBe(409);
    });

    it('cannot cancel already CANCELLED → 409', async () => {
        const appt = await makeAppointment('CANCELLED');
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/cancel`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({});
        expect(res.status).toBe(409);
    });

    it('404 for unknown id', async () => {
        const res = await request(app)
            .patch('/api/appointments/99999999/cancel')
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({});
        expect(res.status).toBe(404);
    });
});
