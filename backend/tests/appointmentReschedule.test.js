const request = require('supertest');
const app     = require('../src/app');
const prisma  = require('../src/utils/prismaClient');
const { createTestUsers, deleteTestUsers, TEST_PASSWORD } = require('./helpers/setupUsers');

let users  = {};
let tokens = {};
let blocks = {};         // doctor's time blocks
let appt   = null;       // main test appointment

const login = async (email) => {
    const res = await request(app).post('/api/auth/login').send({ email, password: TEST_PASSWORD });
    return res.body.token;
};

const makeFutureBlock = async (hoursOffset) => {
    const start = new Date(Date.now() + hoursOffset * 60 * 60 * 1000);
    const end   = new Date(start.getTime() + 60 * 60 * 1000);
    return prisma.timeBlock.create({
        data: { doctorId: users.doctor.id, startTime: start, endTime: end, date: start },
    });
};

beforeAll(async () => {
    await deleteTestUsers();
    users = await createTestUsers();

    tokens.patient = await login(users.patient.email);
    tokens.doctor  = await login(users.doctor.email);
    tokens.admin   = await login(users.admin.email);

    // Crear 3 bloques libres: el actual + 2 para reprogramar
    blocks.current = await makeFutureBlock(24);
    blocks.free1   = await makeFutureBlock(48);
    blocks.free2   = await makeFutureBlock(72);

    // Cita existente sobre blocks.current
    appt = await prisma.appointment.create({
        data: {
            date:        blocks.current.startTime,
            patientId:   users.patient.id,
            doctorId:    users.doctor.id,
            timeBlockId: blocks.current.id,
        },
    });
});

afterAll(async () => {
    await prisma.appointment.deleteMany({
        where: { OR: [{ patientId: users.patient.id }, { doctorId: users.doctor.id }] },
    });
    await prisma.timeBlock.deleteMany({
        where: { id: { in: Object.values(blocks).map(b => b.id) } },
    });
    await deleteTestUsers();
    await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/users/:id/appointments/:id/reschedule', () => {

    it('patient reprograma cita PENDING a slot libre → 200', async () => {
        const res = await request(app)
            .patch(`/api/users/${users.patient.id}/appointments/${appt.id}/reschedule`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ timeBlockId: blocks.free1.id });

        expect(res.status).toBe(200);
        expect(res.body.timeBlockId).toBe(blocks.free1.id);

        // bloques.free1 ahora ocupado — restaurar a current para proximos tests
        await prisma.appointment.update({
            where: { id: appt.id },
            data: { timeBlockId: blocks.current.id, date: blocks.current.startTime },
        });
    });

    it('patient no puede reprogramar cita de otro paciente → 403', async () => {
        // Crear otro paciente
        const otherPatient = await prisma.user.create({
            data: { email: 'other_patient@test.com', name: 'Other', role: 'PATIENT', password: 'x' },
        });
        const otherAppt = await prisma.appointment.create({
            data: {
                date:        blocks.free2.startTime,
                patientId:   otherPatient.id,
                doctorId:    users.doctor.id,
                timeBlockId: blocks.free2.id,
            },
        });

        const res = await request(app)
            .patch(`/api/users/${otherPatient.id}/appointments/${otherAppt.id}/reschedule`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ timeBlockId: blocks.free1.id });

        expect(res.status).toBe(403);

        // cleanup
        await prisma.appointment.delete({ where: { id: otherAppt.id } });
        await prisma.user.delete({ where: { id: otherPatient.id } });
    });

    it('doctor no puede reprogramar (solo paciente/admin) → 403', async () => {
        const res = await request(app)
            .patch(`/api/users/${users.patient.id}/appointments/${appt.id}/reschedule`)
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({ timeBlockId: blocks.free1.id });

        expect(res.status).toBe(403);
    });

    it('reprogramar a slot ya ocupado → 409', async () => {
        // Crear otra cita que ocupa blocks.free1
        const conflictAppt = await prisma.appointment.create({
            data: {
                date:        blocks.free1.startTime,
                patientId:   users.patient.id,
                doctorId:    users.doctor.id,
                timeBlockId: blocks.free1.id,
            },
        });

        const res = await request(app)
            .patch(`/api/users/${users.patient.id}/appointments/${appt.id}/reschedule`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ timeBlockId: blocks.free1.id });

        expect(res.status).toBe(409);

        await prisma.appointment.delete({ where: { id: conflictAppt.id } });
    });

    it('reprogramar cita CANCELLED → 409', async () => {
        await prisma.appointment.update({ where: { id: appt.id }, data: { status: 'CANCELLED' } });

        const res = await request(app)
            .patch(`/api/users/${users.patient.id}/appointments/${appt.id}/reschedule`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ timeBlockId: blocks.free1.id });

        expect(res.status).toBe(409);
        expect(res.body.code).toBe('INVALID_STATE');

        // restaurar a PENDING para tests posteriores
        await prisma.appointment.update({ where: { id: appt.id }, data: { status: 'PENDING' } });
    });

    it('reprogramar cita inexistente → 404', async () => {
        const res = await request(app)
            .patch(`/api/users/${users.patient.id}/appointments/999999/reschedule`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({ timeBlockId: blocks.free1.id });

        expect(res.status).toBe(404);
    });

    it('sin token → 401', async () => {
        const res = await request(app)
            .patch(`/api/users/${users.patient.id}/appointments/${appt.id}/reschedule`)
            .send({ timeBlockId: blocks.free1.id });

        expect(res.status).toBe(401);
    });

    it('timeBlockId faltante → 400 (Joi)', async () => {
        const res = await request(app)
            .patch(`/api/users/${users.patient.id}/appointments/${appt.id}/reschedule`)
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send({});

        expect(res.status).toBe(400);
    });

    it('admin puede reprogramar cita de cualquier paciente → 200', async () => {
        const res = await request(app)
            .patch(`/api/users/${users.patient.id}/appointments/${appt.id}/reschedule`)
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({ timeBlockId: blocks.free2.id });

        expect(res.status).toBe(200);
        expect(res.body.timeBlockId).toBe(blocks.free2.id);
    });
});
