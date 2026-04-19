const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');
const { createTestUsers, deleteTestUsers, TEST_PASSWORD } = require('./helpers/setupUsers');

let users = {};
let tokens = {};
let timeBlock = null;

const getToken = async (email) => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: TEST_PASSWORD });
    return res.body.token;
};

const cleanupReservations = async () => {
    if (!users.patient?.id && !users.doctor?.id) return;
    await prisma.appointment.deleteMany({
        where: {
            OR: [
                { patientId: users.patient?.id },
                { doctorId: users.doctor?.id }
            ]
        }
    });
};

beforeAll(async () => {
    await deleteTestUsers();
    users = await createTestUsers();

    tokens.patient = await getToken(users.patient.email);
    tokens.doctor  = await getToken(users.doctor.email);

    // Crear time block directamente via Prisma (con date requerido)
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // mañana
    const endTime   = new Date(startTime.getTime() + 60 * 60 * 1000); // +1h

    timeBlock = await prisma.timeBlock.create({
        data: {
            doctorId:  users.doctor.id,
            startTime,
            endTime,
            date: startTime,
        }
    });
});

afterAll(async () => {
    await cleanupReservations();
    if (timeBlock) {
        await prisma.timeBlock.deleteMany({ where: { id: timeBlock.id } });
    }
    await deleteTestUsers();
    await prisma.$disconnect();
});

// ─── Crear reserva ────────────────────────────────────────────────────────────

describe('POST /api/users/:id/reservations', () => {
    it('patient crea una reserva correctamente → 201', async () => {
        const res = await request(app)
            .post(`/api/users/${users.patient.id}/reservations`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({
                doctorId:    users.doctor.id,
                patientId:   users.patient.id,
                timeBlockId: timeBlock.id,
                reason:      'Consulta general'
            });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.patientId).toBe(users.patient.id);
        expect(res.body.doctorId).toBe(users.doctor.id);
    });

    it('doble booking — mismo time block → 400', async () => {
        const res = await request(app)
            .post(`/api/users/${users.patient.id}/reservations`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({
                doctorId:    users.doctor.id,
                patientId:   users.patient.id,
                timeBlockId: timeBlock.id,
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/ya existe una reserva/i);
    });

    it('time block que no pertenece al doctor → 400', async () => {
        const res = await request(app)
            .post(`/api/users/${users.patient.id}/reservations`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({
                doctorId:    users.admin.id, // doctor incorrecto
                patientId:   users.patient.id,
                timeBlockId: timeBlock.id,
            });

        expect(res.status).toBe(400);
    });

    it('doctor no puede crear reservas → 403', async () => {
        const res = await request(app)
            .post(`/api/users/${users.doctor.id}/reservations`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({
                doctorId:    users.doctor.id,
                patientId:   users.doctor.id,
                timeBlockId: timeBlock.id,
            });

        expect(res.status).toBe(403);
    });
});

// ─── Eliminar reserva ─────────────────────────────────────────────────────────

describe('DELETE /api/users/:id/reservations/:reservationId', () => {
    let reservationToDelete = null;
    let extraTimeBlock = null;

    beforeAll(async () => {
        // Crear un time block y reservation exclusivos para estos tests
        const startTime = new Date(Date.now() + 48 * 60 * 60 * 1000); // pasado mañana
        const endTime   = new Date(startTime.getTime() + 60 * 60 * 1000);

        extraTimeBlock = await prisma.timeBlock.create({
            data: { doctorId: users.doctor.id, startTime, endTime, date: startTime }
        });

        reservationToDelete = await prisma.appointment.create({
            data: {
                reason:      'Para borrar',
                date:        startTime,
                patientId:   users.patient.id,
                doctorId:    users.doctor.id,
                timeBlockId: extraTimeBlock.id,
            }
        });

        tokens.admin = await getToken(users.admin.email);
    });

    afterAll(async () => {
        // Limpiar si el test de 204 falló y no se borró
        if (reservationToDelete) {
            await prisma.appointment.deleteMany({ where: { id: reservationToDelete.id } });
        }
        if (extraTimeBlock) {
            await prisma.timeBlock.deleteMany({ where: { id: extraTimeBlock.id } });
        }
    });

    it('admin elimina reserva existente → 204', async () => {
        const res = await request(app)
            .delete(`/api/users/${users.patient.id}/reservations/${reservationToDelete.id}`)
            .set('Authorization', `Bearer ${tokens.admin}`);

        expect(res.status).toBe(204);

        // Verificar que realmente se eliminó de la DB
        const deleted = await prisma.appointment.findUnique({ where: { id: reservationToDelete.id } });
        expect(deleted).toBeNull();
        reservationToDelete = null; // marcar como ya borrado
    });

    it('admin intenta eliminar reserva inexistente → 404', async () => {
        const res = await request(app)
            .delete(`/api/users/${users.patient.id}/reservations/999999`)
            .set('Authorization', `Bearer ${tokens.admin}`);

        expect(res.status).toBe(404);
    });

    it('patient no puede eliminar reservas → 403', async () => {
        const res = await request(app)
            .delete(`/api/users/${users.patient.id}/reservations/1`)
            .set('Authorization', `Bearer ${tokens.patient}`);

        expect(res.status).toBe(403);
    });
});

// ─── Listar reservas ──────────────────────────────────────────────────────────

describe('GET /api/users/:id/reservations', () => {
    it('patient ve sus propias reservas → 200', async () => {
        const res = await request(app)
            .get(`/api/users/${users.patient.id}/reservations`)
            .set('Authorization', `Bearer ${tokens.patient}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    it('doctor ve sus propias reservas → 200', async () => {
        const res = await request(app)
            .get(`/api/users/${users.doctor.id}/reservations`)
            .set('Authorization', `Bearer ${tokens.doctor}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});
