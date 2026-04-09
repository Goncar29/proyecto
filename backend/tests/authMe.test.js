/**
 * Integration tests for GET /api/auth/me.
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

beforeAll(async () => {
    await deleteTestUsers();
    users = await createTestUsers();
    tokens.patient = await getToken(users.patient.email);
});

afterAll(async () => {
    await deleteTestUsers();
    await prisma.$disconnect();
});

describe('GET /api/auth/me', () => {
    it('returns current user profile without password', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${tokens.patient}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id', users.patient.id);
        expect(res.body).toHaveProperty('email', users.patient.email);
        expect(res.body).toHaveProperty('role', 'PATIENT');
        expect(res.body).not.toHaveProperty('password');
    });

    it('returns 401 without token', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });
});
