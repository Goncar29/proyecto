/**
 * Integration tests for:
 *   PUT    /api/users/:userId/appointments/:id  — update appointment (notes/reason)
 *   DELETE /api/users/:userId/appointments/:id  — hard delete (admin only)
 *
 * Route constraints (from appointments.js):
 *   PUT    → doctor or admin
 *   DELETE → admin only
 *
 * Note: updateAppointment and deleteAppointment wrap Prisma errors and
 * re-throw generic errors, so unknown IDs return 400 (not 404).
 */
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');
const { createTestUsers, deleteTestUsers, TEST_PASSWORD } = require('./helpers/setupUsers');

let users = {};
let tokens = {};

const getToken = async (email) => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: TEST_PASSWORD });
    return res.body.token;
};

const makeAppointment = async (status = 'PENDING') => {
    const start = new Date(Date.now() + Math.random() * 10 * 24 * 3600 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const date = new Date(start);
    date.setUTCHours(0, 0, 0, 0);

    const tb = await prisma.timeBlock.create({
        data: { doctorId: users.doctor.id, date, startTime: start, endTime: end },
    });
    return prisma.appointment.create({
        data: {
            patient: { connect: { id: users.patient.id } },
            doctor:  { connect: { id: users.doctor.id } },
            timeBlock: { connect: { id: tb.id } },
            status,
            date,
        },
    });
};

beforeAll(async () => {
    await deleteTestUsers();
    users = await createTestUsers();
    tokens.patient = await getToken(users.patient.email);
    tokens.doctor  = await getToken(users.doctor.email);
    tokens.admin   = await getToken(users.admin.email);
});

afterAll(async () => {
    await prisma.appointment.deleteMany({
        where: { OR: [{ patientId: users.patient?.id }, { doctorId: users.doctor?.id }] },
    });
    await prisma.timeBlock.deleteMany({ where: { doctorId: users.doctor?.id } });
    await deleteTestUsers();
    await prisma.$disconnect();
});

// Convenience: build the route url using the patient's userId (mergeParams mount)
const url = (apptId) => `/api/users/${users.patient.id}/appointments/${apptId}`;

// ---------------------------------------------------------------------------
// PUT /api/users/:userId/appointments/:id
// ---------------------------------------------------------------------------
describe('PUT /api/users/:userId/appointments/:id', () => {
    it('doctor actualiza notes → 200 con notes guardadas', async () => {
        const appt = await makeAppointment('PENDING');
        const res = await request(app)
            .put(url(appt.id))
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({ notes: 'Recordar traer estudios' });
        expect(res.status).toBe(200);
        expect(res.body.notes).toBe('Recordar traer estudios');
    });

    it('admin actualiza reason → 200 con reason guardado', async () => {
        const appt = await makeAppointment('CONFIRMED');
        const res = await request(app)
            .put(url(appt.id))
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({ reason: 'Reagendado por el médico' });
        expect(res.status).toBe(200);
        expect(res.body.reason).toBe('Reagendado por el médico');
    });

    it('status en el body es ignorado — no cambia el estado', async () => {
        const appt = await makeAppointment('PENDING');
        const res = await request(app)
            .put(url(appt.id))
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({ status: 'COMPLETED', notes: 'intento de bypass' });
        expect(res.status).toBe(200);
        // El status no debe haber cambiado
        expect(res.body.status).toBe('PENDING');
    });

    it('body vacío → 200 sin cambios', async () => {
        const appt = await makeAppointment('CONFIRMED');
        const res = await request(app)
            .put(url(appt.id))
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({});
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(appt.id);
    });

    it('ID desconocido → 404', async () => {
        const res = await request(app)
            .put(`/api/users/${users.patient.id}/appointments/99999999`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({ notes: 'no existe' });
        expect(res.status).toBe(404);
    });

    it('paciente no puede actualizar → 403', async () => {
        const appt = await makeAppointment('PENDING');
        const res = await request(app)
            .put(url(appt.id))
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ notes: 'intento' });
        expect(res.status).toBe(403);
    });

    it('sin token → 401', async () => {
        const appt = await makeAppointment('PENDING');
        const res = await request(app)
            .put(url(appt.id))
            .send({ notes: 'sin auth' });
        expect(res.status).toBe(401);
    });
});

// ---------------------------------------------------------------------------
// DELETE /api/users/:userId/appointments/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/users/:userId/appointments/:id', () => {
    it('admin elimina cita existente → 204 sin body', async () => {
        const appt = await makeAppointment('PENDING');
        const res = await request(app)
            .delete(url(appt.id))
            .set('Authorization', `Bearer ${tokens.admin}`);
        expect(res.status).toBe(204);
        expect(res.body).toEqual({});
    });

    it('cita eliminada ya no existe en el listado del paciente', async () => {
        const appt = await makeAppointment('PENDING');
        await request(app)
            .delete(url(appt.id))
            .set('Authorization', `Bearer ${tokens.admin}`);

        const list = await request(app)
            .get(`/api/users/${users.patient.id}/appointments`)
            .set('Authorization', `Bearer ${tokens.patient}`);
        const found = list.body.items.find(a => a.id === appt.id);
        expect(found).toBeUndefined();
    });

    it('ID desconocido → 404', async () => {
        const res = await request(app)
            .delete(`/api/users/${users.patient.id}/appointments/99999999`)
            .set('Authorization', `Bearer ${tokens.admin}`);
        expect(res.status).toBe(404);
    });

    it('doctor no puede eliminar → 403', async () => {
        const appt = await makeAppointment('CONFIRMED');
        const res = await request(app)
            .delete(url(appt.id))
            .set('Authorization', `Bearer ${tokens.doctor}`);
        expect(res.status).toBe(403);
    });

    it('paciente no puede eliminar → 403', async () => {
        const appt = await makeAppointment('PENDING');
        const res = await request(app)
            .delete(url(appt.id))
            .set('Authorization', `Bearer ${tokens.patient}`);
        expect(res.status).toBe(403);
    });

    it('sin token → 401', async () => {
        const appt = await makeAppointment('PENDING');
        const res = await request(app)
            .delete(url(appt.id));
        expect(res.status).toBe(401);
    });
});
