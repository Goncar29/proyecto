/**
 * Tests for AuditLog metadata — Fase C
 */
const request = require('supertest');
const app     = require('../src/app');
const prisma  = require('../src/utils/prismaClient');
const { logAudit } = require('../src/services/audit');
const { createTestUsers, deleteTestUsers, TEST_PASSWORD } = require('./helpers/setupUsers');

let users = {};
let tokens = {};

const getToken = async (email) => {
    const res = await request(app).post('/api/auth/login').send({ email, password: TEST_PASSWORD });
    return res.body.token;
};

beforeAll(async () => {
    await deleteTestUsers();
    users = await createTestUsers();
    tokens.admin   = await getToken(users.admin.email);
    tokens.patient = await getToken(users.patient.email);
});

afterAll(async () => {
    await deleteTestUsers();
    await prisma.$disconnect();
});

// ─── Unit tests para logAudit ────────────────────────────────────────────────

describe('logAudit — metadata', () => {
    it('con metadata → persiste en DB', async () => {
        const meta = { method: 'POST', path: '/test', extra: 'data' };
        await logAudit(users.patient.id, 'test_action_meta', meta);

        const log = await prisma.auditLog.findFirst({
            where: { userId: users.patient.id, action: 'test_action_meta' },
            orderBy: { timestamp: 'desc' },
        });

        expect(log).not.toBeNull();
        expect(log.metadata).toMatchObject(meta);
    });

    it('sin metadata → metadata es null en DB (backwards compat)', async () => {
        await logAudit(users.patient.id, 'test_action_no_meta');

        const log = await prisma.auditLog.findFirst({
            where: { userId: users.patient.id, action: 'test_action_no_meta' },
            orderBy: { timestamp: 'desc' },
        });

        expect(log).not.toBeNull();
        expect(log.metadata).toBeNull();
    });

    it('metadata > 10KB → guarda { truncated: true, originalSize }', async () => {
        const bigMeta = { data: 'x'.repeat(11 * 1024) }; // 11 KB
        await logAudit(users.patient.id, 'test_action_big', bigMeta);

        const log = await prisma.auditLog.findFirst({
            where: { userId: users.patient.id, action: 'test_action_big' },
            orderBy: { timestamp: 'desc' },
        });

        expect(log.metadata).toMatchObject({ truncated: true });
        expect(log.metadata.originalSize).toBeGreaterThan(10 * 1024);
    });

    it('metadata con campo password → campo omitido (sanitizer)', async () => {
        const meta = { method: 'POST', password: 'supersecret', changedFields: ['name'] };
        await logAudit(users.patient.id, 'test_action_sanitize', meta);

        const log = await prisma.auditLog.findFirst({
            where: { userId: users.patient.id, action: 'test_action_sanitize' },
            orderBy: { timestamp: 'desc' },
        });

        expect(log.metadata).not.toHaveProperty('password');
        expect(log.metadata).toHaveProperty('method', 'POST');
        expect(log.metadata).toHaveProperty('changedFields');
    });
});

// ─── Integration: middleware auto-enrichment ─────────────────────────────────

describe('auditMiddleware — auto-enrichment', () => {
    it('entrada de audit tiene { method, path, statusCode, ip }', async () => {
        // Hacemos un PUT /users/:id para triggerear auditMiddleware
        await request(app)
            .put(`/api/users/${users.patient.id}`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ name: 'Nombre Test Audit' });

        const log = await prisma.auditLog.findFirst({
            where: { userId: users.patient.id, action: 'Actualizar usuario' },
            orderBy: { timestamp: 'desc' },
        });

        expect(log).not.toBeNull();
        expect(log.metadata).toHaveProperty('method', 'PUT');
        expect(log.metadata).toHaveProperty('path');
        expect(log.metadata).toHaveProperty('statusCode', 200);
        expect(log.metadata).toHaveProperty('ip');
    });
});

// ─── Integration: GET /admin/audit retorna campo metadata ────────────────────

describe('GET /admin/audit — metadata en respuesta', () => {
    it('devuelve el campo metadata en cada item', async () => {
        const res = await request(app)
            .get('/api/admin/audit')
            .set('Authorization', `Bearer ${tokens.admin}`)
            .query({ limit: 5, page: 1 });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('items');
        expect(Array.isArray(res.body.items)).toBe(true);
        // Cada item debe tener la key metadata (aunque sea null)
        for (const item of res.body.items) {
            expect(item).toHaveProperty('metadata');
        }
    });
});
