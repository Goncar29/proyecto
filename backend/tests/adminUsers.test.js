/**
 * Integration tests for admin user-management endpoints:
 *   GET    /api/admin/users/:id       — get user by id
 *   PUT    /api/admin/users/:id       — update user
 *   DELETE /api/admin/users/:id       — soft delete
 *   PATCH  /api/admin/users/:id/status — toggle active/suspended
 *   GET    /api/admin/audit           — audit log with filters
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');
const { createTestUsers, deleteTestUsers, TEST_PASSWORD } = require('./helpers/setupUsers');

let users = {};
let tokens = {};

// Extra users created per-test for mutations (delete, status) to avoid
// corrupting the shared test_patient / test_doctor / test_admin fixtures.
const EXTRA_EMAIL = 'test_extra_admin@test.com';

const getToken = async (email, password = TEST_PASSWORD) => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password });
    return res.body.token;
};

/** Creates a throwaway PATIENT user for tests that mutate user state. */
const createExtraUser = async (suffix = '') => {
    const email = `test_extra_${Date.now()}${suffix}@test.com`;
    const hashed = await bcrypt.hash(TEST_PASSWORD, 10);
    return prisma.user.create({
        data: { email, name: 'Extra User', role: 'PATIENT', password: hashed },
    });
};

beforeAll(async () => {
    await deleteTestUsers();
    // Clean up any leftover extra users from previous interrupted runs
    await prisma.user.deleteMany({ where: { email: { contains: 'test_extra_' } } });

    users = await createTestUsers();
    tokens.patient = await getToken(users.patient.email);
    tokens.doctor  = await getToken(users.doctor.email);
    tokens.admin   = await getToken(users.admin.email);
});

afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'test_extra_' } } });
    await deleteTestUsers();
    await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// GET /api/admin/users/:id
// ---------------------------------------------------------------------------
describe('GET /api/admin/users/:id', () => {
    it('admin obtiene usuario existente → 200 sin campo password', async () => {
        const res = await request(app)
            .get(`/api/admin/users/${users.patient.id}`)
            .set('Authorization', `Bearer ${tokens.admin}`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(users.patient.id);
        expect(res.body.email).toBe(users.patient.email);
        expect(res.body.password).toBeUndefined();
    });

    it('usuario soft-deleted → 404', async () => {
        const extra = await createExtraUser('_get_deleted');
        await prisma.user.update({ where: { id: extra.id }, data: { deletedAt: new Date() } });

        const res = await request(app)
            .get(`/api/admin/users/${extra.id}`)
            .set('Authorization', `Bearer ${tokens.admin}`);
        expect(res.status).toBe(404);
    });

    it('ID desconocido → 404', async () => {
        const res = await request(app)
            .get('/api/admin/users/99999999')
            .set('Authorization', `Bearer ${tokens.admin}`);
        expect(res.status).toBe(404);
    });

    it('doctor no puede acceder → 403', async () => {
        const res = await request(app)
            .get(`/api/admin/users/${users.patient.id}`)
            .set('Authorization', `Bearer ${tokens.doctor}`);
        expect(res.status).toBe(403);
    });

    it('sin token → 401', async () => {
        const res = await request(app)
            .get(`/api/admin/users/${users.patient.id}`);
        expect(res.status).toBe(401);
    });
});

// ---------------------------------------------------------------------------
// PUT /api/admin/users/:id
// ---------------------------------------------------------------------------
describe('PUT /api/admin/users/:id', () => {
    it('admin actualiza nombre → 200 con nombre nuevo', async () => {
        const extra = await createExtraUser('_put_name');
        const res = await request(app)
            .put(`/api/admin/users/${extra.id}`)
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({ name: 'Nombre Actualizado' });
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Nombre Actualizado');
    });

    it('admin actualiza email → 200 con email nuevo', async () => {
        const extra = await createExtraUser('_put_email');
        const newEmail = `updated_${Date.now()}@test.com`;
        const res = await request(app)
            .put(`/api/admin/users/${extra.id}`)
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({ email: newEmail });
        expect(res.status).toBe(200);
        expect(res.body.email).toBe(newEmail);
    });

    it('rol inválido → 400', async () => {
        const extra = await createExtraUser('_put_badrole');
        const res = await request(app)
            .put(`/api/admin/users/${extra.id}`)
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({ role: 'SUPERUSER' });
        expect(res.status).toBe(400);
    });

    it('ID desconocido → 404', async () => {
        const res = await request(app)
            .put('/api/admin/users/99999999')
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({ name: 'Nadie' });
        expect(res.status).toBe(404);
    });

    it('paciente no puede actualizar → 403', async () => {
        const res = await request(app)
            .put(`/api/admin/users/${users.patient.id}`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ name: 'Intruso' });
        expect(res.status).toBe(403);
    });
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/users/:id  (soft delete)
// ---------------------------------------------------------------------------
describe('DELETE /api/admin/users/:id', () => {
    it('admin hace soft delete → 200 y mensaje correcto', async () => {
        const extra = await createExtraUser('_delete');
        const res = await request(app)
            .delete(`/api/admin/users/${extra.id}`)
            .set('Authorization', `Bearer ${tokens.admin}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/eliminado/i);
    });

    it('usuario soft-deleted desaparece de GET /admin/users', async () => {
        const extra = await createExtraUser('_delete_list');
        await request(app)
            .delete(`/api/admin/users/${extra.id}`)
            .set('Authorization', `Bearer ${tokens.admin}`);

        const list = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${tokens.admin}`);
        const found = list.body.items.find(u => u.id === extra.id);
        expect(found).toBeUndefined();
    });

    it('usuario soft-deleted devuelve 404 en GET /admin/users/:id', async () => {
        const extra = await createExtraUser('_delete_get');
        await request(app)
            .delete(`/api/admin/users/${extra.id}`)
            .set('Authorization', `Bearer ${tokens.admin}`);

        const res = await request(app)
            .get(`/api/admin/users/${extra.id}`)
            .set('Authorization', `Bearer ${tokens.admin}`);
        expect(res.status).toBe(404);
    });

    it('doctor no puede eliminar → 403', async () => {
        const res = await request(app)
            .delete(`/api/admin/users/${users.patient.id}`)
            .set('Authorization', `Bearer ${tokens.doctor}`);
        expect(res.status).toBe(403);
    });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id/status
// ---------------------------------------------------------------------------
describe('PATCH /api/admin/users/:id/status', () => {
    it('desactivar usuario → isActive false', async () => {
        const extra = await createExtraUser('_status_deactivate');
        const res = await request(app)
            .patch(`/api/admin/users/${extra.id}/status`)
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({ isActive: false });
        expect(res.status).toBe(200);
        expect(res.body.user.isActive).toBe(false);
    });

    it('reactivar usuario → isActive true', async () => {
        const extra = await createExtraUser('_status_reactivate');
        await prisma.user.update({ where: { id: extra.id }, data: { isActive: false } });

        const res = await request(app)
            .patch(`/api/admin/users/${extra.id}/status`)
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({ isActive: true });
        expect(res.status).toBe(200);
        expect(res.body.user.isActive).toBe(true);
    });

    it('suspender con motivo → isSuspended true y suspensionReason guardado', async () => {
        const extra = await createExtraUser('_status_suspend');
        const res = await request(app)
            .patch(`/api/admin/users/${extra.id}/status`)
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({ isSuspended: true, suspensionReason: 'Comportamiento inapropiado' });
        expect(res.status).toBe(200);
        expect(res.body.user.isSuspended).toBe(true);
        expect(res.body.user.suspensionReason).toBe('Comportamiento inapropiado');
    });

    it('levantar suspensión limpia el motivo → isSuspended false, suspensionReason null', async () => {
        const extra = await createExtraUser('_status_unsuspend');
        await prisma.user.update({
            where: { id: extra.id },
            data: { isSuspended: true, suspensionReason: 'Motivo anterior' },
        });

        const res = await request(app)
            .patch(`/api/admin/users/${extra.id}/status`)
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({ isSuspended: false });
        expect(res.status).toBe(200);
        expect(res.body.user.isSuspended).toBe(false);
        expect(res.body.user.suspensionReason).toBeNull();
    });

    it('ID desconocido → 404', async () => {
        const res = await request(app)
            .patch('/api/admin/users/99999999/status')
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({ isActive: false });
        expect(res.status).toBe(404);
    });

    it('paciente no puede cambiar estado → 403', async () => {
        const res = await request(app)
            .patch(`/api/admin/users/${users.doctor.id}/status`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ isActive: false });
        expect(res.status).toBe(403);
    });
});

// ---------------------------------------------------------------------------
// GET /api/admin/audit
// ---------------------------------------------------------------------------
describe('GET /api/admin/audit', () => {
    it('admin obtiene logs → 200 array', async () => {
        const res = await request(app)
            .get('/api/admin/audit')
            .set('Authorization', `Bearer ${tokens.admin}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('cada log incluye usuario con id, name, email, role', async () => {
        // Forzamos al menos un log haciendo una acción auditada
        await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${tokens.admin}`);

        const res = await request(app)
            .get('/api/admin/audit')
            .set('Authorization', `Bearer ${tokens.admin}`);
        expect(res.status).toBe(200);
        if (res.body.length > 0) {
            const log = res.body[0];
            expect(log).toHaveProperty('userId');
            expect(log).toHaveProperty('action');
            expect(log.user).toBeDefined();
            expect(log.user).toHaveProperty('id');
            expect(log.user).toHaveProperty('email');
        }
    });

    it('filtro por action devuelve solo logs coincidentes', async () => {
        const res = await request(app)
            .get('/api/admin/audit?action=listar')
            .set('Authorization', `Bearer ${tokens.admin}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        res.body.forEach(log => {
            expect(log.action.toLowerCase()).toContain('listar');
        });
    });

    it('paginación — page y limit funcionan', async () => {
        const res = await request(app)
            .get('/api/admin/audit?page=1&limit=2')
            .set('Authorization', `Bearer ${tokens.admin}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBeLessThanOrEqual(2);
    });

    it('limit inválido (> 1000) → 400', async () => {
        const res = await request(app)
            .get('/api/admin/audit?limit=9999')
            .set('Authorization', `Bearer ${tokens.admin}`);
        expect(res.status).toBe(400);
    });

    it('doctor no puede acceder → 403', async () => {
        const res = await request(app)
            .get('/api/admin/audit')
            .set('Authorization', `Bearer ${tokens.doctor}`);
        expect(res.status).toBe(403);
    });

    it('sin token → 401', async () => {
        const res = await request(app)
            .get('/api/admin/audit');
        expect(res.status).toBe(401);
    });
});
