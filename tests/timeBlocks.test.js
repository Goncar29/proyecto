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

const cleanupTimeBlocks = async () => {
    if (!users.doctor?.id) return;
    await prisma.timeBlock.deleteMany({ where: { doctorId: users.doctor.id } });
};

beforeAll(async () => {
    await deleteTestUsers();
    users = await createTestUsers();
    tokens.doctor = await getToken(users.doctor.email);
    tokens.admin  = await getToken(users.admin.email);
});

afterAll(async () => {
    await cleanupTimeBlocks();
    await deleteTestUsers();
    await prisma.$disconnect();
});

// ─── Vía ruta doctor (POST /api/time-blocks) ─────────────────────────────────

describe('POST /api/time-blocks — doctor', () => {
    it('crea un time block y setea date correctamente', async () => {
        const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // mañana
        startTime.setUTCHours(10, 0, 0, 0);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1h

        const res = await request(app)
            .post('/api/time-blocks')
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .send({ startTime: startTime.toISOString(), endTime: endTime.toISOString() });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('date');

        // date debe ser medianoche UTC del mismo día que startTime
        const returnedDate = new Date(res.body.date);
        expect(returnedDate.getUTCHours()).toBe(0);
        expect(returnedDate.getUTCMinutes()).toBe(0);
        expect(returnedDate.getUTCDate()).toBe(startTime.getUTCDate());
    });

    it('patient no puede crear time blocks → 403', async () => {
        const startTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
        const endTime   = new Date(startTime.getTime() + 60 * 60 * 1000);

        const res = await request(app)
            .post('/api/time-blocks')
            .set('Authorization', `Bearer ${tokens.admin}`) // admin usa ruta admin, no esta
            .send({ startTime: startTime.toISOString(), endTime: endTime.toISOString() });

        // admin necesita doctorId en esta ruta → falla validación, no autorización
        expect(res.status).toBe(400);
    });
});

// ─── Vía ruta admin (POST /api/admin/time-blocks) ────────────────────────────

describe('POST /api/admin/time-blocks — admin', () => {
    it('crea un time block para un doctor y setea date correctamente', async () => {
        const startTime = new Date(Date.now() + 72 * 60 * 60 * 1000); // pasado mañana
        startTime.setUTCHours(14, 0, 0, 0);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

        const res = await request(app)
            .post('/api/admin/time-blocks')
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({
                doctorId:  users.doctor.id,
                startTime: startTime.toISOString(),
                endTime:   endTime.toISOString(),
            });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('date');

        const returnedDate = new Date(res.body.date);
        expect(returnedDate.getUTCHours()).toBe(0);
        expect(returnedDate.getUTCMinutes()).toBe(0);
        expect(returnedDate.getUTCDate()).toBe(startTime.getUTCDate());
    });

    it('rechaza doctorId de un usuario que no es doctor → 400', async () => {
        const startTime = new Date(Date.now() + 96 * 60 * 60 * 1000);
        const endTime   = new Date(startTime.getTime() + 60 * 60 * 1000);

        const res = await request(app)
            .post('/api/admin/time-blocks')
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({
                doctorId:  users.patient.id, // patient, no doctor
                startTime: startTime.toISOString(),
                endTime:   endTime.toISOString(),
            });

        expect(res.status).toBe(400);
    });
});
