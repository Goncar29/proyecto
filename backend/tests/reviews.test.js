/**
 * Integration tests for POST /api/doctors/:id/reviews.
 * Validates the Serializable ACID pattern: review insert + DoctorProfile
 * aggregate recompute happen atomically and stay consistent.
 */
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');
const { createTestUsers, deleteTestUsers, TEST_PASSWORD } = require('./helpers/setupUsers');

let users = {};
let tokens = {};
let profile;

const getToken = async (email) => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: TEST_PASSWORD });
    return res.body.token;
};

const makeCompletedAppointment = async () => {
    const start = new Date(Date.now() - Math.random() * 10 * 24 * 3600 * 1000);
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
            status: 'COMPLETED',
            date,
        },
    });
};

beforeAll(async () => {
    await deleteTestUsers();
    users = await createTestUsers();
    profile = await prisma.doctorProfile.upsert({
        where: { userId: users.doctor.id },
        update: { avgRating: 0, reviewCount: 0 },
        create: {
            userId: users.doctor.id,
            specialty: 'General',
            specialties: ['General'],
        },
    });
    tokens.patient = await getToken(users.patient.email);
    tokens.doctor = await getToken(users.doctor.email);
    tokens.admin = await getToken(users.admin.email);
});

afterAll(async () => {
    await prisma.review.deleteMany({ where: { doctorProfileId: profile.id } });
    await prisma.appointment.deleteMany({
        where: { OR: [{ patientId: users.patient?.id }, { doctorId: users.doctor?.id }] },
    });
    await prisma.timeBlock.deleteMany({ where: { doctorId: users.doctor?.id } });
    await prisma.doctorProfile.deleteMany({ where: { userId: users.doctor?.id } });
    await deleteTestUsers();
    await prisma.$disconnect();
});

describe('POST /api/doctors/:id/reviews', () => {
    it('patient creates review on COMPLETED appointment → 201 and aggregate updated', async () => {
        const appt = await makeCompletedAppointment();
        const res = await request(app)
            .post(`/api/doctors/${users.doctor.id}/reviews`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ appointmentId: appt.id, rating: 5, text: 'Excelente' });
        expect(res.status).toBe(201);
        expect(res.body.rating).toBe(5);

        const p = await prisma.doctorProfile.findUnique({ where: { id: profile.id } });
        const agg = await prisma.review.aggregate({
            where: { doctorProfileId: profile.id },
            _avg: { rating: true },
            _count: { _all: true },
        });
        expect(p.reviewCount).toBe(agg._count._all);
        expect(p.avgRating).toBeCloseTo(agg._avg.rating ?? 0, 5);
    });

    it('non-patient (doctor) → 403', async () => {
        const appt = await makeCompletedAppointment();
        const res = await request(app)
            .post(`/api/doctors/${users.doctor.id}/reviews`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({ appointmentId: appt.id, rating: 4 });
        expect(res.status).toBe(403);
    });

    it('appointment not COMPLETED → 409', async () => {
        const start = new Date(Date.now() + 3 * 24 * 3600 * 1000);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const date = new Date(start); date.setUTCHours(0, 0, 0, 0);
        const tb = await prisma.timeBlock.create({
            data: { doctorId: users.doctor.id, date, startTime: start, endTime: end },
        });
        const appt = await prisma.appointment.create({
            data: {
                patient: { connect: { id: users.patient.id } },
                doctor: { connect: { id: users.doctor.id } },
                timeBlock: { connect: { id: tb.id } },
                status: 'CONFIRMED',
                date,
            },
        });
        const res = await request(app)
            .post(`/api/doctors/${users.doctor.id}/reviews`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ appointmentId: appt.id, rating: 4 });
        expect(res.status).toBe(409);
    });

    it('duplicate review on same appointment → 409', async () => {
        const appt = await makeCompletedAppointment();
        const first = await request(app)
            .post(`/api/doctors/${users.doctor.id}/reviews`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ appointmentId: appt.id, rating: 3 });
        expect(first.status).toBe(201);
        const dup = await request(app)
            .post(`/api/doctors/${users.doctor.id}/reviews`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ appointmentId: appt.id, rating: 3 });
        expect(dup.status).toBe(409);
    });

    it('rating out of range → 400', async () => {
        const appt = await makeCompletedAppointment();
        const res = await request(app)
            .post(`/api/doctors/${users.doctor.id}/reviews`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ appointmentId: appt.id, rating: 6 });
        expect(res.status).toBe(400);
    });

    it('unknown doctor id → 404', async () => {
        const appt = await makeCompletedAppointment();
        const res = await request(app)
            .post('/api/doctors/99999999/reviews')
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ appointmentId: appt.id, rating: 5 });
        expect(res.status).toBe(404);
    });
});
