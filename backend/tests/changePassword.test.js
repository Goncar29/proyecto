/**
 * Tests del endpoint PATCH /api/users/me/password
 */
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');

const testUser = {
    email: 'changepwd@test.com',
    password: 'password123',
    name: 'Change Password Test',
};

let token;

const cleanup = async () => {
    const user = await prisma.user.findUnique({ where: { email: testUser.email } });
    if (user) {
        await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
        await prisma.auditLog.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
    }
};

beforeAll(async () => {
    await cleanup();
    await request(app).post('/api/auth/register').send(testUser);
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });
    token = res.body.token;
});

afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
});

describe('PATCH /api/users/me/password', () => {
    it('cambia la contraseña correctamente', async () => {
        const res = await request(app)
            .patch('/api/users/me/password')
            .set('Authorization', `Bearer ${token}`)
            .send({ currentPassword: testUser.password, newPassword: 'nuevaPass999' });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/actualizada/i);

        // Login con la nueva password funciona
        const loginOk = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: 'nuevaPass999' });
        expect(loginOk.status).toBe(200);

        // Login con la vieja falla
        const loginFail = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: testUser.password });
        expect(loginFail.status).toBe(401);

        // Actualizar para tests siguientes
        testUser.password = 'nuevaPass999';
        const newLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: testUser.password });
        token = newLogin.body.token;
    });

    it('contraseña actual incorrecta → 400', async () => {
        const res = await request(app)
            .patch('/api/users/me/password')
            .set('Authorization', `Bearer ${token}`)
            .send({ currentPassword: 'wrongPassword', newPassword: 'otraPass123' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('WRONG_CURRENT_PASSWORD');
    });

    it('nueva password igual a la actual → 400', async () => {
        const res = await request(app)
            .patch('/api/users/me/password')
            .set('Authorization', `Bearer ${token}`)
            .send({ currentPassword: testUser.password, newPassword: testUser.password });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('SAME_PASSWORD');
    });

    it('nueva password menor a 8 chars → 400 (Joi)', async () => {
        const res = await request(app)
            .patch('/api/users/me/password')
            .set('Authorization', `Bearer ${token}`)
            .send({ currentPassword: testUser.password, newPassword: 'abc' });

        expect(res.status).toBe(400);
    });

    it('sin token → 401', async () => {
        const res = await request(app)
            .patch('/api/users/me/password')
            .send({ currentPassword: testUser.password, newPassword: 'otraPass123' });

        expect(res.status).toBe(401);
    });

    it('sin currentPassword → 400 (Joi)', async () => {
        const res = await request(app)
            .patch('/api/users/me/password')
            .set('Authorization', `Bearer ${token}`)
            .send({ newPassword: 'otraPass123' });

        expect(res.status).toBe(400);
    });
});
