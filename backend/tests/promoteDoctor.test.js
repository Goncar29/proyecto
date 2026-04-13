/**
 * Integration tests for POST /api/admin/users/:id/promote-to-doctor.
 * Validates atomic promotion: User.role → DOCTOR + DoctorProfile created.
 */
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');
const { createTestUsers, deleteTestUsers, TEST_PASSWORD } = require('./helpers/setupUsers');

let users = {};
let adminToken;

const getToken = async (email) => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: TEST_PASSWORD });
    return res.body.token;
};

beforeAll(async () => {
    await deleteTestUsers();
    users = await createTestUsers();
    adminToken = await getToken(users.admin.email);
});

afterAll(async () => {
    // Clean up profiles and reset roles created during tests
    await prisma.doctorProfile.deleteMany({
        where: { userId: { in: [users.patient?.id] } },
    });
    await prisma.user.updateMany({
        where: { id: users.patient?.id },
        data: { role: 'PATIENT' },
    });
    await deleteTestUsers();
    await prisma.$disconnect();
});

const promote = (userId, body, token = adminToken) =>
    request(app)
        .post(`/api/admin/users/${userId}/promote-to-doctor`)
        .set('Authorization', `Bearer ${token}`)
        .send(body);

describe('POST /api/admin/users/:id/promote-to-doctor', () => {
    afterEach(async () => {
        // Reset patient back for next test
        await prisma.doctorProfile.deleteMany({ where: { userId: users.patient.id } });
        await prisma.user.update({
            where: { id: users.patient.id },
            data: { role: 'PATIENT' },
        });
    });

    it('promotes PATIENT to DOCTOR with DoctorProfile → 200', async () => {
        const res = await promote(users.patient.id, {
            specialty: 'Cardiology',
            hospital: 'Hospital Central',
        });
        expect(res.status).toBe(200);
        expect(res.body.user.role).toBe('DOCTOR');
        expect(res.body.doctorProfile.specialty).toBe('Cardiology');
        expect(res.body.doctorProfile.specialties).toEqual(['Cardiology']);

        // Verify in DB
        const profile = await prisma.doctorProfile.findUnique({
            where: { userId: users.patient.id },
        });
        expect(profile).not.toBeNull();
        expect(profile.specialty).toBe('Cardiology');
    });

    it('specialties array is stored when provided', async () => {
        const res = await promote(users.patient.id, {
            specialty: 'Cardiology',
            specialties: ['Cardiology', 'Internal Medicine'],
        });
        expect(res.status).toBe(200);
        expect(res.body.doctorProfile.specialties).toEqual(['Cardiology', 'Internal Medicine']);
    });

    it('already DOCTOR → 409', async () => {
        // First promote
        await promote(users.patient.id, { specialty: 'General' });
        // Second attempt
        const res = await promote(users.patient.id, { specialty: 'General' });
        expect(res.status).toBe(409);
    });

    it('ADMIN cannot be promoted → 409', async () => {
        const res = await promote(users.admin.id, { specialty: 'General' });
        expect(res.status).toBe(409);
    });

    it('non-admin caller → 403', async () => {
        const patientToken = await getToken(users.patient.email);
        const res = await promote(users.patient.id, { specialty: 'General' }, patientToken);
        expect(res.status).toBe(403);
    });

    it('missing specialty → 400', async () => {
        const res = await promote(users.patient.id, { hospital: 'Hospital' });
        expect(res.status).toBe(400);
    });

    it('unknown user id → 404', async () => {
        const res = await promote(99999999, { specialty: 'General' });
        expect(res.status).toBe(404);
    });
});
