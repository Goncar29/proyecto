const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');
const bcrypt = require('bcryptjs');

const makeUser = (suffix) => ({
    email: `test_mw_${suffix}@test.com`,
    password: 'password123',
    name: `MW User ${suffix}`,
    role: 'PATIENT',
});

const cleanupUser = async (email) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
        await prisma.auditLog.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
    }
};

const createUser = async (suffix) => {
    const data = makeUser(suffix);
    await cleanupUser(data.email);
    const hashed = await bcrypt.hash(data.password, 10);
    return prisma.user.create({
        data: { ...data, password: hashed },
    });
};

const getToken = async (email) => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'password123' });
    return res.body.token;
};

// ─── Token inválido ───────────────────────────────────────────────────────────

describe('Token inválido o ausente', () => {
    it('sin token → 401', async () => {
        const res = await request(app).get('/api/time-blocks');
        expect(res.status).toBe(401);
    });

    it('token malformado → 403', async () => {
        const res = await request(app)
            .get('/api/time-blocks')
            .set('Authorization', 'Bearer esto_no_es_un_jwt');
        expect(res.status).toBe(403);
    });

    it('token con firma inválida → 403', async () => {
        const res = await request(app)
            .get('/api/time-blocks')
            .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJpZCI6OTk5fQ.firma_falsa');
        expect(res.status).toBe(403);
    });
});

// ─── Usuario eliminado ────────────────────────────────────────────────────────

describe('Usuario con soft delete', () => {
    let token;
    let user;

    beforeAll(async () => {
        user = await createUser('deleted');
        token = await getToken(user.email);
        // Soft delete DESPUÉS de obtener el token
        await prisma.user.update({
            where: { id: user.id },
            data: { deletedAt: new Date() },
        });
    });

    afterAll(() => cleanupUser(user.email));

    it('token válido pero usuario eliminado → 401', async () => {
        const res = await request(app)
            .get('/api/time-blocks')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(401);
    });
});

// ─── Usuario suspendido ───────────────────────────────────────────────────────

describe('Usuario suspendido', () => {
    let token;
    let user;

    beforeAll(async () => {
        user = await createUser('suspended');
        token = await getToken(user.email);
        // Suspender DESPUÉS de obtener el token
        await prisma.user.update({
            where: { id: user.id },
            data: { isSuspended: true, suspensionReason: 'Test suspension' },
        });
    });

    afterAll(() => cleanupUser(user.email));

    it('token válido pero usuario suspendido → 401', async () => {
        const res = await request(app)
            .get('/api/time-blocks')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(401);
    });

    it('usuario suspendido no puede hacer login', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: user.email, password: 'password123' });
        expect(res.status).toBe(401);
    });
});

// ─── Usuario inactivo ─────────────────────────────────────────────────────────

describe('Usuario inactivo', () => {
    let token;
    let user;

    beforeAll(async () => {
        user = await createUser('inactive');
        token = await getToken(user.email);
        // Desactivar DESPUÉS de obtener el token
        await prisma.user.update({
            where: { id: user.id },
            data: { isActive: false },
        });
    });

    afterAll(() => cleanupUser(user.email));

    it('token válido pero usuario inactivo → 401', async () => {
        const res = await request(app)
            .get('/api/time-blocks')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(401);
    });

    it('usuario inactivo no puede hacer login', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: user.email, password: 'password123' });
        expect(res.status).toBe(401);
    });
});
