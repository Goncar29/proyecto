/**
 * Tests de CRUD de citas (Appointment).
 * Endpoint principal: /api/appointments
 * Listado por usuario: /api/users/:id/appointments
 */
const request = require('supertest');
const app     = require('../src/app');
const prisma  = require('../src/utils/prismaClient');
const { createTestUsers, deleteTestUsers, TEST_PASSWORD } = require('./helpers/setupUsers');

let users      = {};
let tokens     = {};
let timeBlock  = null;

const getToken = async (email) => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: TEST_PASSWORD });
    return res.body.token;
};

const cleanupAppointments = async () => {
    if (!users.patient?.id && !users.doctor?.id) return;
    await prisma.appointment.deleteMany({
        where: {
            OR: [
                { patientId: users.patient?.id },
                { doctorId:  users.doctor?.id  },
            ],
        },
    });
};

beforeAll(async () => {
    await deleteTestUsers();
    users = await createTestUsers();

    tokens.patient = await getToken(users.patient.email);
    tokens.doctor  = await getToken(users.doctor.email);
    tokens.admin   = await getToken(users.admin.email);

    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // mañana
    const endTime   = new Date(startTime.getTime() + 60 * 60 * 1000);

    timeBlock = await prisma.timeBlock.create({
        data: { doctorId: users.doctor.id, startTime, endTime, date: startTime },
    });
});

afterAll(async () => {
    await cleanupAppointments();
    if (timeBlock) await prisma.timeBlock.deleteMany({ where: { id: timeBlock.id } });
    await deleteTestUsers();
    await prisma.$disconnect();
});

// ─── Crear cita ───────────────────────────────────────────────────────────────

describe('POST /api/appointments', () => {
    afterEach(cleanupAppointments);

    it('patient crea una cita correctamente → 201', async () => {
        const res = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ timeBlockId: timeBlock.id, notes: 'Consulta general' });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.patientId).toBe(users.patient.id);
        expect(res.body.doctorId).toBe(users.doctor.id);
    });

    it('doble booking — mismo time block → 409', async () => {
        // Primera cita
        await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ timeBlockId: timeBlock.id });

        // Segunda cita sobre el mismo bloque
        const res = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ timeBlockId: timeBlock.id });

        expect(res.status).toBe(409);
    });

    it('time block inexistente → 404', async () => {
        const res = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ timeBlockId: 999999 });

        expect(res.status).toBe(404);
    });

    it('sin autenticación → 401', async () => {
        const res = await request(app)
            .post('/api/appointments')
            .send({ timeBlockId: timeBlock.id });

        expect(res.status).toBe(401);
    });
});

// ─── Eliminar cita ────────────────────────────────────────────────────────────

describe('DELETE /api/appointments/:id', () => {
    let appointmentToDelete = null;
    let extraTimeBlock      = null;

    beforeAll(async () => {
        const startTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
        const endTime   = new Date(startTime.getTime() + 60 * 60 * 1000);

        extraTimeBlock = await prisma.timeBlock.create({
            data: { doctorId: users.doctor.id, startTime, endTime, date: startTime },
        });

        appointmentToDelete = await prisma.appointment.create({
            data: {
                reason:      'Para borrar',
                date:        startTime,
                patientId:   users.patient.id,
                doctorId:    users.doctor.id,
                timeBlockId: extraTimeBlock.id,
            },
        });
    });

    afterAll(async () => {
        if (appointmentToDelete) {
            await prisma.appointment.deleteMany({ where: { id: appointmentToDelete.id } });
        }
        if (extraTimeBlock) {
            await prisma.timeBlock.deleteMany({ where: { id: extraTimeBlock.id } });
        }
    });

    it('admin elimina cita existente → 204', async () => {
        const res = await request(app)
            .delete(`/api/appointments/${appointmentToDelete.id}`)
            .set('Authorization', `Bearer ${tokens.admin}`);

        expect(res.status).toBe(204);

        const deleted = await prisma.appointment.findUnique({ where: { id: appointmentToDelete.id } });
        expect(deleted).toBeNull();
        appointmentToDelete = null;
    });

    it('admin intenta eliminar cita inexistente → 404', async () => {
        const res = await request(app)
            .delete('/api/appointments/999999')
            .set('Authorization', `Bearer ${tokens.admin}`);

        expect(res.status).toBe(404);
    });

    it('patient no puede eliminar citas → 403', async () => {
        const res = await request(app)
            .delete('/api/appointments/1')
            .set('Authorization', `Bearer ${tokens.patient}`);

        expect(res.status).toBe(403);
    });
});

// ─── Listar citas por usuario ─────────────────────────────────────────────────

describe('GET /api/users/:id/appointments', () => {
    it('patient ve sus propias citas → 200 con paginación', async () => {
        const res = await request(app)
            .get(`/api/users/${users.patient.id}/appointments`)
            .set('Authorization', `Bearer ${tokens.patient}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('items');
        expect(Array.isArray(res.body.items)).toBe(true);
        expect(res.body).toHaveProperty('total');
    });

    it('doctor ve sus propias citas → 200', async () => {
        const res = await request(app)
            .get(`/api/users/${users.doctor.id}/appointments`)
            .set('Authorization', `Bearer ${tokens.doctor}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('items');
        expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('patient no puede ver citas de otro usuario → 403', async () => {
        const res = await request(app)
            .get(`/api/users/${users.doctor.id}/appointments`)
            .set('Authorization', `Bearer ${tokens.patient}`);

        expect(res.status).toBe(403);
    });
});
