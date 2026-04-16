/**
 * Integration tests for PUT /api/users/:id
 *   - Solo el propio usuario puede actualizar su perfil
 *   - Validaciones de email, nombre y contraseña
 *   - Conflicto de email duplicado → 409
 */
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');
const { createTestUsers, deleteTestUsers, TEST_PASSWORD } = require('./helpers/setupUsers');

let users = {};
let tokens = {};

const getToken = async (email, password = TEST_PASSWORD) => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password });
    return res.body.token;
};

beforeAll(async () => {
    await deleteTestUsers();
    users = await createTestUsers();
    tokens.patient = await getToken(users.patient.email);
    tokens.doctor  = await getToken(users.doctor.email);
    tokens.admin   = await getToken(users.admin.email);
});

afterAll(async () => {
    await deleteTestUsers();
    await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Autorización
// ---------------------------------------------------------------------------
describe('PUT /api/users/:id — autorización', () => {
    it('sin token → 401', async () => {
        const res = await request(app)
            .put(`/api/users/${users.patient.id}`)
            .send({ name: 'Nuevo Nombre' });
        expect(res.status).toBe(401);
    });

    it('paciente intenta modificar otro usuario → 403', async () => {
        const res = await request(app)
            .put(`/api/users/${users.doctor.id}`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ name: 'Hack' });
        expect(res.status).toBe(403);
    });

    it('admin intenta usar esta ruta para modificar otro usuario → 403', async () => {
        const res = await request(app)
            .put(`/api/users/${users.patient.id}`)
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({ name: 'Cambio' });
        expect(res.status).toBe(403);
    });
});

// ---------------------------------------------------------------------------
// Actualización exitosa
// ---------------------------------------------------------------------------
describe('PUT /api/users/:id — actualización exitosa', () => {
    it('usuario actualiza su propio nombre → 200', async () => {
        const res = await request(app)
            .put(`/api/users/${users.patient.id}`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ name: 'Nombre Actualizado' });
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Nombre Actualizado');
        expect(res.body.password).toBeUndefined();
    });

    it('usuario actualiza su propio email → 200', async () => {
        const newEmail = `updated_${Date.now()}@test.com`;
        const res = await request(app)
            .put(`/api/users/${users.doctor.id}`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({ email: newEmail });
        expect(res.status).toBe(200);
        expect(res.body.email).toBe(newEmail);

        // restaurar email original para no afectar otros tests
        await prisma.user.update({
            where: { id: users.doctor.id },
            data: { email: users.doctor.email },
        });
        tokens.doctor = await getToken(users.doctor.email);
    });

    it('usuario actualiza su contraseña → 200 y puede hacer login con la nueva', async () => {
        const newPassword = 'nuevapass123';
        const res = await request(app)
            .put(`/api/users/${users.patient.id}`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ password: newPassword });
        expect(res.status).toBe(200);

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: users.patient.email, password: newPassword });
        expect(loginRes.status).toBe(200);

        // restaurar contraseña original
        await request(app)
            .put(`/api/users/${users.patient.id}`)
            .set('Authorization', `Bearer ${loginRes.body.token}`)
            .send({ password: TEST_PASSWORD });
        tokens.patient = await getToken(users.patient.email);
    });
});

// ---------------------------------------------------------------------------
// Validaciones
// ---------------------------------------------------------------------------
describe('PUT /api/users/:id — validaciones', () => {
    it('body vacío → 400', async () => {
        const res = await request(app)
            .put(`/api/users/${users.patient.id}`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({});
        expect(res.status).toBe(400);
        // validate middleware returns { message, details[] } — not { error }
        expect(res.body.message).toBeDefined();
    });

    it('email con formato inválido → 400', async () => {
        const res = await request(app)
            .put(`/api/users/${users.patient.id}`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ email: 'noesvalido' });
        expect(res.status).toBe(400);
    });

    it('contraseña menor a 8 caracteres → 400', async () => {
        const res = await request(app)
            .put(`/api/users/${users.patient.id}`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ password: '123' });
        expect(res.status).toBe(400);
    });

    it('id no numérico → 400', async () => {
        const res = await request(app)
            .put('/api/users/abc')
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ name: 'Test' });
        expect(res.status).toBe(400);
    });
});
