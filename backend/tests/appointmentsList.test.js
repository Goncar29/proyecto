/**
 * Integration tests for GET /api/users/:id/appointments (extended).
 * Exercises:
 *  - pagination envelope
 *  - status filter
 *  - ownership enforcement (patient cannot read someone else)
 *  - admin can read anyone
 *  - same endpoint serves doctors (their own agenda)
 */
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');
const { createTestUsers, deleteTestUsers, TEST_PASSWORD } = require('./helpers/setupUsers');

let users = {};
let tokens = {};
let timeBlock = null;

const getToken = async (email) => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: TEST_PASSWORD });
    return res.body.token;
};

const cleanupAppointments = async () => {
    if (!users.patient?.id && !users.doctor?.id) return;
    await prisma.appointment.deleteMany({
        where: {
            OR: [
                { patientId: users.patient?.id },
                { doctorId: users.doctor?.id },
            ],
        },
    });
};

beforeAll(async () => {
    await deleteTestUsers();
    users = await createTestUsers();
    tokens.patient = await getToken(users.patient.email);
    tokens.doctor = await getToken(users.doctor.email);
    tokens.admin = await getToken(users.admin.email);

    const start = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const date = new Date(start);
    date.setUTCHours(0, 0, 0, 0);
    timeBlock = await prisma.timeBlock.create({
        data: { doctorId: users.doctor.id, date, startTime: start, endTime: end },
    });

    await prisma.appointment.create({
        data: {
            patient: { connect: { id: users.patient.id } },
            doctor: { connect: { id: users.doctor.id } },
            timeBlock: { connect: { id: timeBlock.id } },
            status: 'CONFIRMED',
            date,
        },
    });
});

afterAll(async () => {
    await cleanupAppointments();
    if (timeBlock) await prisma.timeBlock.delete({ where: { id: timeBlock.id } }).catch(() => {});
    await deleteTestUsers();
    await prisma.$disconnect();
});

describe('GET /api/users/:id/appointments', () => {
    it('patient reads own appointments — paginated envelope', async () => {
        const res = await request(app)
            .get(`/api/users/${users.patient.id}/appointments`)
            .set('Authorization', `Bearer ${tokens.patient}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('items');
        expect(res.body).toHaveProperty('total');
        expect(res.body).toHaveProperty('page', 1);
        expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it('doctor reads own agenda via same endpoint', async () => {
        const res = await request(app)
            .get(`/api/users/${users.doctor.id}/appointments`)
            .set('Authorization', `Bearer ${tokens.doctor}`);
        expect(res.status).toBe(200);
        expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it('filters by status', async () => {
        const res = await request(app)
            .get(`/api/users/${users.patient.id}/appointments?status=CONFIRMED`)
            .set('Authorization', `Bearer ${tokens.patient}`);
        expect(res.status).toBe(200);
        for (const a of res.body.items) expect(a.status).toBe('CONFIRMED');
    });

    it('rejects invalid status', async () => {
        const res = await request(app)
            .get(`/api/users/${users.patient.id}/appointments?status=BOGUS`)
            .set('Authorization', `Bearer ${tokens.patient}`);
        expect(res.status).toBe(400);
    });

    it('rejects multi-status with invalid value', async () => {
        const res = await request(app)
            .get(`/api/users/${users.patient.id}/appointments?status=CONFIRMED,BOGUS`)
            .set('Authorization', `Bearer ${tokens.patient}`);
        expect(res.status).toBe(400);
    });

    it('accepts multi-status filter — all returned items match one of the statuses', async () => {
        const res = await request(app)
            .get(`/api/users/${users.patient.id}/appointments?status=CANCELLED,COMPLETED`)
            .set('Authorization', `Bearer ${tokens.patient}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('items');
        for (const a of res.body.items) {
            expect(['CANCELLED', 'COMPLETED']).toContain(a.status);
        }
    });

    it('patient cannot read another user appointments → 403', async () => {
        const res = await request(app)
            .get(`/api/users/${users.doctor.id}/appointments`)
            .set('Authorization', `Bearer ${tokens.patient}`);
        expect(res.status).toBe(403);
    });

    it('admin can read any user appointments', async () => {
        const res = await request(app)
            .get(`/api/users/${users.patient.id}/appointments`)
            .set('Authorization', `Bearer ${tokens.admin}`);
        expect(res.status).toBe(200);
    });
});
