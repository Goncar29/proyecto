const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');
const { createTestUsers, deleteTestUsers, TEST_PASSWORD } = require('./helpers/setupUsers');

let tokens = {};

const getToken = async (email) => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: TEST_PASSWORD });
    return res.body.token;
};

beforeAll(async () => {
    await deleteTestUsers();
    const users = await createTestUsers();

    tokens.patient = await getToken(users.patient.email);
    tokens.doctor  = await getToken(users.doctor.email);
    tokens.admin   = await getToken(users.admin.email);
});

afterAll(async () => {
    await deleteTestUsers();
    await prisma.$disconnect();
});

// ─── Sin token ────────────────────────────────────────────────────────────────

describe('Rutas protegidas sin token', () => {
    it('GET /api/time-blocks sin token → 401', async () => {
        const res = await request(app).get('/api/time-blocks');
        expect(res.status).toBe(401);
    });

    it('GET /api/admin/users sin token → 401', async () => {
        const res = await request(app).get('/api/admin/users');
        expect(res.status).toBe(401);
    });
});

// ─── Patient ──────────────────────────────────────────────────────────────────

describe('Patient — acceso denegado', () => {
    it('POST /api/time-blocks → 403', async () => {
        const res = await request(app)
            .post('/api/time-blocks')
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({});
        expect(res.status).toBe(403);
    });

    it('PUT /api/time-blocks/1 → 403', async () => {
        const res = await request(app)
            .put('/api/time-blocks/1')
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({});
        expect(res.status).toBe(403);
    });

    it('DELETE /api/time-blocks/1 → 403', async () => {
        const res = await request(app)
            .delete('/api/time-blocks/1')
            .set('Authorization', `Bearer ${tokens.patient}`);
        expect(res.status).toBe(403);
    });

    it('GET /api/admin/users → 403', async () => {
        const res = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${tokens.patient}`);
        expect(res.status).toBe(403);
    });

    it('GET /api/admin/reservations → 403', async () => {
        const res = await request(app)
            .get('/api/admin/reservations')
            .set('Authorization', `Bearer ${tokens.patient}`);
        expect(res.status).toBe(403);
    });
});

describe('Patient — acceso permitido', () => {
    it('GET /api/time-blocks → 200', async () => {
        const res = await request(app)
            .get('/api/time-blocks')
            .set('Authorization', `Bearer ${tokens.patient}`);
        expect(res.status).toBe(200);
    });
});

// ─── Doctor ───────────────────────────────────────────────────────────────────

describe('Doctor — acceso denegado', () => {
    it('GET /api/admin/users → 403', async () => {
        const res = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${tokens.doctor}`);
        expect(res.status).toBe(403);
    });

    it('GET /api/admin/reservations → 403', async () => {
        const res = await request(app)
            .get('/api/admin/reservations')
            .set('Authorization', `Bearer ${tokens.doctor}`);
        expect(res.status).toBe(403);
    });
});

describe('Doctor — acceso permitido', () => {
    it('GET /api/time-blocks → 200', async () => {
        const res = await request(app)
            .get('/api/time-blocks')
            .set('Authorization', `Bearer ${tokens.doctor}`);
        expect(res.status).toBe(200);
    });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

describe('Admin — acceso permitido', () => {
    it('GET /api/admin/users → 200', async () => {
        const res = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${tokens.admin}`);
        expect(res.status).toBe(200);
    });

    it('GET /api/admin/reservations → 200', async () => {
        const res = await request(app)
            .get('/api/admin/reservations')
            .set('Authorization', `Bearer ${tokens.admin}`);
        expect(res.status).toBe(200);
    });

    it('GET /api/time-blocks → 200', async () => {
        const res = await request(app)
            .get('/api/time-blocks')
            .set('Authorization', `Bearer ${tokens.admin}`);
        expect(res.status).toBe(200);
    });
});
