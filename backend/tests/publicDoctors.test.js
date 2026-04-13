/**
 * Integration tests for public doctor discovery endpoints.
 * Relies on seeded data (>= 6 doctors, >= 15 reviews). Run prisma:seed first.
 */
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');

afterAll(async () => {
    await prisma.$disconnect();
});

describe('GET /api/public/doctors', () => {
    it('returns paginated envelope with items/total/page/pageSize', async () => {
        const res = await request(app).get('/api/public/doctors');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('items');
        expect(res.body).toHaveProperty('total');
        expect(res.body).toHaveProperty('page', 1);
        expect(res.body).toHaveProperty('pageSize');
        expect(Array.isArray(res.body.items)).toBe(true);
        expect(res.body.items.length).toBeGreaterThan(0);
        const d = res.body.items[0];
        expect(d).toHaveProperty('id');
        expect(d).toHaveProperty('name');
        expect(d).toHaveProperty('specialty');
        expect(d).toHaveProperty('avgRating');
        expect(d).toHaveProperty('reviewCount');
    });

    it('respects pageSize and page params', async () => {
        const res = await request(app).get('/api/public/doctors?page=1&pageSize=2');
        expect(res.status).toBe(200);
        expect(res.body.pageSize).toBe(2);
        expect(res.body.items.length).toBeLessThanOrEqual(2);
    });

    it('filters by specialty', async () => {
        const any = await prisma.doctorProfile.findFirst({ select: { specialty: true } });
        if (!any) return;
        const res = await request(app)
            .get(`/api/public/doctors?specialty=${encodeURIComponent(any.specialty)}`);
        expect(res.status).toBe(200);
        for (const d of res.body.items) {
            expect(d.specialty).toBe(any.specialty);
        }
    });

    it('excludes soft-deleted / suspended / inactive doctors', async () => {
        const res = await request(app).get('/api/public/doctors?pageSize=50');
        expect(res.status).toBe(200);
        const ids = res.body.items.map((d) => d.id);
        if (ids.length === 0) return;
        const bad = await prisma.user.findMany({
            where: {
                id: { in: ids },
                OR: [{ isActive: false }, { isSuspended: true }, { deletedAt: { not: null } }],
            },
        });
        expect(bad.length).toBe(0);
    });

    it('rejects invalid query (pageSize > 50)', async () => {
        const res = await request(app).get('/api/public/doctors?pageSize=999');
        expect(res.status).toBe(400);
    });
});

describe('GET /api/public/doctors/:id', () => {
    it('returns full profile with ratingHistogram', async () => {
        const profile = await prisma.doctorProfile.findFirst({ include: { user: true } });
        expect(profile).not.toBeNull();
        const res = await request(app).get(`/api/public/doctors/${profile.user.id}`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(profile.user.id);
        expect(res.body).toHaveProperty('bio');
        expect(res.body).toHaveProperty('ratingHistogram');
        expect(res.body.ratingHistogram).toHaveProperty('1');
        expect(res.body.ratingHistogram).toHaveProperty('5');
        const histTotal = Object.values(res.body.ratingHistogram).reduce((a, b) => a + b, 0);
        expect(histTotal).toBe(res.body.reviewCount);
    });

    it('returns 404 for unknown id', async () => {
        const res = await request(app).get('/api/public/doctors/99999999');
        expect(res.status).toBe(404);
    });

    it('returns 404 for non-numeric id', async () => {
        const res = await request(app).get('/api/public/doctors/abc');
        expect(res.status).toBe(404);
    });
});

describe('GET /api/public/doctors/:id/reviews', () => {
    let doctorUserId;
    beforeAll(async () => {
        const p = await prisma.doctorProfile.findFirst({
            where: { reviewCount: { gt: 0 } },
            include: { user: true },
        });
        doctorUserId = p?.user.id;
    });

    it('returns paginated reviews', async () => {
        if (!doctorUserId) return;
        const res = await request(app).get(`/api/public/doctors/${doctorUserId}/reviews`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('items');
        expect(res.body).toHaveProperty('total');
        if (res.body.items.length > 0) {
            const r = res.body.items[0];
            expect(r).toHaveProperty('rating');
            expect(r).toHaveProperty('patient');
        }
    });

    it('honors sort=rating_desc', async () => {
        if (!doctorUserId) return;
        const res = await request(app)
            .get(`/api/public/doctors/${doctorUserId}/reviews?sort=rating_desc&pageSize=50`);
        expect(res.status).toBe(200);
        const ratings = res.body.items.map((r) => r.rating);
        for (let i = 1; i < ratings.length; i++) {
            expect(ratings[i]).toBeLessThanOrEqual(ratings[i - 1]);
        }
    });

    it('rejects invalid sort', async () => {
        if (!doctorUserId) return;
        const res = await request(app)
            .get(`/api/public/doctors/${doctorUserId}/reviews?sort=bogus`);
        expect(res.status).toBe(400);
    });
});

describe('GET /api/public/doctors/:id/availability', () => {
    it('returns array of unbooked time blocks; booked slots excluded, cancelled re-included', async () => {
        // Pick a doctor that has at least one TimeBlock.
        const block = await prisma.timeBlock.findFirst({
            include: { doctor: true, appointment: true },
        });
        if (!block) return;
        const doctorUserId = block.doctorId;

        // Create a booked block (CONFIRMED) and a cancelled block for this doctor
        // on a known future date to assert filtering.
        const future = new Date();
        future.setUTCHours(0, 0, 0, 0);
        future.setUTCDate(future.getUTCDate() + 10);
        const start1 = new Date(future); start1.setUTCHours(9);
        const end1 = new Date(future);   end1.setUTCHours(10);
        const start2 = new Date(future); start2.setUTCHours(11);
        const end2 = new Date(future);   end2.setUTCHours(12);
        const start3 = new Date(future); start3.setUTCHours(13);
        const end3 = new Date(future);   end3.setUTCHours(14);

        // Clean up any prior test blocks on that date
        await prisma.appointment.deleteMany({
            where: { timeBlock: { doctorId: doctorUserId, date: future } },
        });
        await prisma.timeBlock.deleteMany({
            where: { doctorId: doctorUserId, date: future },
        });

        const freeBlock = await prisma.timeBlock.create({
            data: { doctorId: doctorUserId, date: future, startTime: start1, endTime: end1 },
        });
        const bookedBlock = await prisma.timeBlock.create({
            data: { doctorId: doctorUserId, date: future, startTime: start2, endTime: end2 },
        });
        const cancelledBlock = await prisma.timeBlock.create({
            data: { doctorId: doctorUserId, date: future, startTime: start3, endTime: end3 },
        });

        // Need a patient for appointments
        const patient = await prisma.user.findFirst({ where: { role: 'PATIENT' } });
        await prisma.appointment.create({
            data: {
                patient: { connect: { id: patient.id } },
                doctor: { connect: { id: doctorUserId } },
                timeBlock: { connect: { id: bookedBlock.id } },
                status: 'CONFIRMED',
                date: future,
            },
        });
        await prisma.appointment.create({
            data: {
                patient: { connect: { id: patient.id } },
                doctor: { connect: { id: doctorUserId } },
                timeBlock: { connect: { id: cancelledBlock.id } },
                status: 'CANCELLED',
                date: future,
            },
        });

        const from = future.toISOString();
        const toDate = new Date(future); toDate.setUTCDate(toDate.getUTCDate() + 1);
        const to = toDate.toISOString();

        const res = await request(app)
            .get(`/api/public/doctors/${doctorUserId}/availability?from=${from}&to=${to}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        const ids = res.body.map((b) => b.id);
        expect(ids).toContain(freeBlock.id);
        expect(ids).toContain(cancelledBlock.id);
        expect(ids).not.toContain(bookedBlock.id);

        // cleanup
        await prisma.appointment.deleteMany({
            where: { timeBlockId: { in: [bookedBlock.id, cancelledBlock.id] } },
        });
        await prisma.timeBlock.deleteMany({
            where: { id: { in: [freeBlock.id, bookedBlock.id, cancelledBlock.id] } },
        });
    });

    it('rejects ranges > 60 days', async () => {
        const profile = await prisma.doctorProfile.findFirst({ include: { user: true } });
        if (!profile) return;
        const from = new Date().toISOString();
        const to = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString();
        const res = await request(app)
            .get(`/api/public/doctors/${profile.user.id}/availability?from=${from}&to=${to}`);
        expect(res.status).toBe(400);
    });
});
