/**
 * Tests del flujo de recuperación de contraseña.
 * Mockea el envío de email (Resend) para no hacer llamadas de red.
 */

// Mock de email ANTES de requerir la app
jest.mock('../src/utils/email', () => ({
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

const crypto = require('crypto');
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');
const { sendPasswordResetEmail } = require('../src/utils/email');
const { hashToken } = require('../src/services/passwordResetService');

const testUser = {
    email: 'pwreset@test.com',
    password: 'password123',
    name: 'Password Reset Test',
};

let userId;

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
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(201);
    const user = await prisma.user.findUnique({ where: { email: testUser.email } });
    userId = user.id;
});

afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
});

beforeEach(() => {
    sendPasswordResetEmail.mockClear();
});

describe('POST /api/auth/forgot-password', () => {
    it('email existente → 200, genera token y manda email', async () => {
        const res = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: testUser.email });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Si el email existe/i);

        const tokens = await prisma.passwordResetToken.findMany({ where: { userId } });
        expect(tokens).toHaveLength(1);
        expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
        const [, resetUrl] = sendPasswordResetEmail.mock.calls[0];
        expect(resetUrl).toMatch(/\/reset-password\?token=[a-f0-9]{64}$/);
    });

    it('email inexistente → 200 mismo mensaje (enumeration prevention) y sin email', async () => {
        const res = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'noexiste@fake.com' });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Si el email existe/i);
        expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('email inválido → 400', async () => {
        const res = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'not-an-email' });

        expect(res.status).toBe(400);
    });
});

describe('POST /api/auth/reset-password', () => {
    const insertToken = async ({ expiresIn = 30 * 60 * 1000, used = false } = {}) => {
        const tokenPlain = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(tokenPlain);
        const expiresAt = new Date(Date.now() + expiresIn);
        await prisma.passwordResetToken.deleteMany({ where: { userId } });
        await prisma.passwordResetToken.create({
            data: {
                userId,
                tokenHash,
                expiresAt,
                usedAt: used ? new Date() : null,
            },
        });
        return tokenPlain;
    };

    it('token válido → 200, cambia password, marca token usado', async () => {
        const tokenPlain = await insertToken();
        const newPassword = 'nuevaPass999';

        const res = await request(app)
            .post('/api/auth/reset-password')
            .send({ token: tokenPlain, newPassword });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/actualizada/i);

        // Login con la nueva password funciona
        const loginOk = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: newPassword });
        expect(loginOk.status).toBe(200);
        expect(loginOk.body.token).toBeTruthy();

        // Login con la vieja falla
        const loginFail = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: testUser.password });
        expect(loginFail.status).toBe(401);

        // El token quedó marcado como usado
        const t = await prisma.passwordResetToken.findFirst({ where: { userId } });
        expect(t.usedAt).not.toBeNull();

        // Dejar la password volver a la original para otros tests (si corrieran después)
        testUser.password = newPassword;
    });

    it('mismo token 2da vez → 400 (single-use)', async () => {
        // Reutiliza el token del test anterior que quedó marcado como usado.
        // No lo sabemos en plaintext, así que insertamos uno usado a propósito.
        const tokenPlain = await insertToken({ used: true });
        const res = await request(app)
            .post('/api/auth/reset-password')
            .send({ token: tokenPlain, newPassword: 'otraPass123' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('token expirado → 400', async () => {
        const tokenPlain = await insertToken({ expiresIn: -1000 });
        const res = await request(app)
            .post('/api/auth/reset-password')
            .send({ token: tokenPlain, newPassword: 'otraPass456' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('token inexistente → 400', async () => {
        const fakeToken = crypto.randomBytes(32).toString('hex');
        const res = await request(app)
            .post('/api/auth/reset-password')
            .send({ token: fakeToken, newPassword: 'otraPass789' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('newPassword < 8 chars → 400 (Joi)', async () => {
        const tokenPlain = await insertToken();
        const res = await request(app)
            .post('/api/auth/reset-password')
            .send({ token: tokenPlain, newPassword: 'abc' });

        expect(res.status).toBe(400);
    });

    it('token con formato inválido → 400 (Joi)', async () => {
        const res = await request(app)
            .post('/api/auth/reset-password')
            .send({ token: 'not-hex!!!', newPassword: 'validPass123' });

        expect(res.status).toBe(400);
    });
});
