/**
 * Integration tests for refresh token flow.
 * Tests: login sets cookie, /refresh rotates tokens, /logout revokes, single-use enforced.
 */
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');

const testUser = {
    email: 'refresh_test@example.com',
    password: 'password123',
    name: 'Refresh Test User',
};

const cleanupTestUser = async () => {
    const user = await prisma.user.findUnique({ where: { email: testUser.email } });
    if (!user) return;
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
};

beforeAll(async () => {
    await cleanupTestUser();
    await request(app).post('/api/auth/register').send(testUser);
});

afterAll(async () => {
    await cleanupTestUser();
    await prisma.$disconnect();
});

/** Extract cookie value from supertest response */
const extractRefreshCookie = (res) => {
    const setCookie = res.headers['set-cookie'];
    if (!Array.isArray(setCookie)) return null;
    const line = setCookie.find(c => c.startsWith('refresh_token='));
    if (!line) return null;
    return line.split(';')[0]; // "refresh_token=<value>"
};

describe('POST /api/auth/login — refresh token cookie', () => {
    it('sets httpOnly refresh_token cookie on login', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: testUser.password });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');

        const cookies = res.headers['set-cookie'];
        expect(Array.isArray(cookies)).toBe(true);
        const refreshCookie = cookies.find(c => c.includes('refresh_token='));
        expect(refreshCookie).toBeDefined();
        expect(refreshCookie).toContain('HttpOnly');
        expect(refreshCookie).toContain('Path=/api/auth');
    });
});

describe('POST /api/auth/refresh', () => {
    let refreshCookie;
    let originalToken;

    beforeAll(async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: testUser.password });
        refreshCookie = extractRefreshCookie(res);
        originalToken = res.body.token;
    });

    it('returns new access token when cookie is valid', async () => {
        const res = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', refreshCookie);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(typeof res.body.token).toBe('string');
        expect(res.body.token.length).toBeGreaterThan(0);
    });

    it('rotates the refresh token (old cookie rejected on second use)', async () => {
        // Login fresh to get a clean cookie
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: testUser.password });
        const cookie = extractRefreshCookie(loginRes);

        // First refresh — should work
        const firstRefresh = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', cookie);
        expect(firstRefresh.status).toBe(200);

        // Second refresh with SAME old cookie — must be rejected (single-use)
        const secondRefresh = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', cookie);
        expect(secondRefresh.status).toBe(401);
    });

    it('returns 401 without cookie', async () => {
        const res = await request(app).post('/api/auth/refresh');
        expect(res.status).toBe(401);
    });

    it('returns 401 with invalid cookie value', async () => {
        const res = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', 'refresh_token=invalido123');
        expect(res.status).toBe(401);
    });
});

describe('POST /api/auth/logout', () => {
    it('revokes refresh token — subsequent refresh fails', async () => {
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: testUser.password });
        const cookie = extractRefreshCookie(loginRes);

        // Logout
        const logoutRes = await request(app)
            .post('/api/auth/logout')
            .set('Cookie', cookie);
        expect(logoutRes.status).toBe(200);

        // Refresh after logout → 401
        const refreshRes = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', cookie);
        expect(refreshRes.status).toBe(401);
    });

    it('returns 200 even without cookie (idempotent)', async () => {
        const res = await request(app).post('/api/auth/logout');
        expect(res.status).toBe(200);
    });
});
