const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');

const testUser = {
    email: 'testuser@example.com',
    password: 'password123',
    name: 'Test User'
};

const cleanupTestUser = async () => {
    const user = await prisma.user.findUnique({ where: { email: testUser.email } });
    if (user) {
        await prisma.auditLog.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
    }
};

beforeAll(async () => {
    await cleanupTestUser();
});

afterAll(async () => {
    await cleanupTestUser();
    await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
    it('registra un usuario nuevo correctamente', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('message');
    });

    it('no permite registrar el mismo email dos veces', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        expect(res.status).toBe(400);
    });

    it('rechaza registro sin email', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ password: 'password123', name: 'Test' });

        expect(res.status).toBe(400);
    });

    it('rechaza contraseña menor a 8 caracteres', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'otro@test.com', password: '123', name: 'Test' });

        expect(res.status).toBe(400);
    });
});

describe('POST /api/auth/login', () => {
    it('hace login correctamente y devuelve token', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: testUser.password });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
    });

    it('rechaza contraseña incorrecta', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: 'wrongpassword' });

        expect(res.status).toBe(401);
    });

    it('rechaza email inexistente', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'noexiste@test.com', password: 'password123' });

        expect(res.status).toBe(401);
    });
});
