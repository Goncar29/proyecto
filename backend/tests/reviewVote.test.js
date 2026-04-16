/**
 * Integration tests for review voting endpoints:
 *   POST /api/doctors/:id/reviews/:reviewId/vote
 *   GET  /api/doctors/:id/reviews/:reviewId/my-vote
 *
 * Validates toggle logic, helpfulCount aggregation, and authorization.
 */
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');
const { createTestUsers, deleteTestUsers, TEST_PASSWORD } = require('./helpers/setupUsers');

let users = {};
let tokens = {};
let profile;
let review;

const getToken = async (email) => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: TEST_PASSWORD });
    return res.body.token;
};

beforeAll(async () => {
    await deleteTestUsers();
    users = await createTestUsers();

    // Doctor profile required to create reviews
    profile = await prisma.doctorProfile.upsert({
        where: { userId: users.doctor.id },
        update: { avgRating: 0, reviewCount: 0 },
        create: { userId: users.doctor.id, specialty: 'General', specialties: ['General'] },
    });

    // Completed appointment + review to vote on
    const start = new Date(Date.now() - 2 * 24 * 3600 * 1000);
    const end   = new Date(start.getTime() + 60 * 60 * 1000);
    const date  = new Date(start); date.setUTCHours(0, 0, 0, 0);
    const tb = await prisma.timeBlock.create({
        data: { doctorId: users.doctor.id, date, startTime: start, endTime: end },
    });
    const appt = await prisma.appointment.create({
        data: {
            patient:   { connect: { id: users.patient.id } },
            doctor:    { connect: { id: users.doctor.id } },
            timeBlock: { connect: { id: tb.id } },
            status: 'COMPLETED',
            date,
        },
    });
    review = await prisma.review.create({
        data: {
            doctorProfileId: profile.id,
            patientId: users.patient.id,
            appointmentId: appt.id,
            rating: 5,
            text: 'Excelente atención',
            helpfulCount: 0,
        },
    });

    tokens.patient = await getToken(users.patient.email);
    tokens.doctor  = await getToken(users.doctor.email);
    tokens.admin   = await getToken(users.admin.email);
});

afterAll(async () => {
    await prisma.reviewVote.deleteMany({ where: { reviewId: review?.id } });
    await prisma.review.deleteMany({ where: { doctorProfileId: profile?.id } });
    await prisma.appointment.deleteMany({
        where: { OR: [{ patientId: users.patient?.id }, { doctorId: users.doctor?.id }] },
    });
    await prisma.timeBlock.deleteMany({ where: { doctorId: users.doctor?.id } });
    await prisma.doctorProfile.deleteMany({ where: { userId: users.doctor?.id } });
    await deleteTestUsers();
    await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// GET my-vote
// ---------------------------------------------------------------------------
describe('GET /api/doctors/:id/reviews/:reviewId/my-vote', () => {
    it('patient with no vote → { userVote: null }', async () => {
        const res = await request(app)
            .get(`/api/doctors/${users.doctor.id}/reviews/${review.id}/my-vote`)
            .set('Authorization', `Bearer ${tokens.patient}`);
        expect(res.status).toBe(200);
        expect(res.body.userVote).toBeNull();
    });

    it('non-patient (doctor) → 403', async () => {
        const res = await request(app)
            .get(`/api/doctors/${users.doctor.id}/reviews/${review.id}/my-vote`)
            .set('Authorization', `Bearer ${tokens.doctor}`);
        expect(res.status).toBe(403);
    });

    it('no token → 401', async () => {
        const res = await request(app)
            .get(`/api/doctors/${users.doctor.id}/reviews/${review.id}/my-vote`);
        expect(res.status).toBe(401);
    });
});

// ---------------------------------------------------------------------------
// POST vote
// ---------------------------------------------------------------------------
describe('POST /api/doctors/:id/reviews/:reviewId/vote', () => {
    beforeEach(async () => {
        // Reset votes and helpfulCount before each test
        await prisma.reviewVote.deleteMany({ where: { reviewId: review.id } });
        await prisma.review.update({ where: { id: review.id }, data: { helpfulCount: 0 } });
    });

    it('patient upvotes → helpfulCount = 1, userVote = 1', async () => {
        const res = await request(app)
            .post(`/api/doctors/${users.doctor.id}/reviews/${review.id}/vote`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ value: 1 });
        expect(res.status).toBe(200);
        expect(res.body.helpfulCount).toBe(1);
        expect(res.body.userVote).toBe(1);
    });

    it('patient downvotes → helpfulCount = 0, userVote = -1', async () => {
        const res = await request(app)
            .post(`/api/doctors/${users.doctor.id}/reviews/${review.id}/vote`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ value: -1 });
        expect(res.status).toBe(200);
        expect(res.body.helpfulCount).toBe(0);
        expect(res.body.userVote).toBe(-1);
    });

    it('same value twice → toggles off, userVote = null', async () => {
        // First vote
        await request(app)
            .post(`/api/doctors/${users.doctor.id}/reviews/${review.id}/vote`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ value: 1 });
        // Same vote again → toggle off
        const res = await request(app)
            .post(`/api/doctors/${users.doctor.id}/reviews/${review.id}/vote`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ value: 1 });
        expect(res.status).toBe(200);
        expect(res.body.userVote).toBeNull();
        expect(res.body.helpfulCount).toBe(0);
    });

    it('change vote from 1 to -1 → helpfulCount recalculated', async () => {
        // First upvote
        await request(app)
            .post(`/api/doctors/${users.doctor.id}/reviews/${review.id}/vote`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ value: 1 });
        // Change to downvote
        const res = await request(app)
            .post(`/api/doctors/${users.doctor.id}/reviews/${review.id}/vote`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ value: -1 });
        expect(res.status).toBe(200);
        expect(res.body.userVote).toBe(-1);
        expect(res.body.helpfulCount).toBe(0);
    });

    it('invalid value (0) → 400', async () => {
        const res = await request(app)
            .post(`/api/doctors/${users.doctor.id}/reviews/${review.id}/vote`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ value: 0 });
        expect(res.status).toBe(400);
    });

    it('non-patient (doctor) → 403', async () => {
        const res = await request(app)
            .post(`/api/doctors/${users.doctor.id}/reviews/${review.id}/vote`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({ value: 1 });
        expect(res.status).toBe(403);
    });

    it('no token → 401', async () => {
        const res = await request(app)
            .post(`/api/doctors/${users.doctor.id}/reviews/${review.id}/vote`)
            .send({ value: 1 });
        expect(res.status).toBe(401);
    });

    it('non-existent review → 404', async () => {
        const res = await request(app)
            .post(`/api/doctors/${users.doctor.id}/reviews/99999999/vote`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ value: 1 });
        expect(res.status).toBe(404);
    });

    it('my-vote reflects after upvote', async () => {
        await request(app)
            .post(`/api/doctors/${users.doctor.id}/reviews/${review.id}/vote`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ value: 1 });
        const res = await request(app)
            .get(`/api/doctors/${users.doctor.id}/reviews/${review.id}/my-vote`)
            .set('Authorization', `Bearer ${tokens.patient}`);
        expect(res.status).toBe(200);
        expect(res.body.userVote).toBe(1);
    });
});
