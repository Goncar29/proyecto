const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');
const { createTestUsers, deleteTestUsers, TEST_PASSWORD } = require('./helpers/setupUsers');

let users = {};
let tokens = {};

const getToken = async (email) => {
    const res = await request(app).post('/api/auth/login').send({ email, password: TEST_PASSWORD });
    return res.body.token;
};

// fecha en el futuro (7 días a partir de hoy) para evitar "slots en el pasado"
const futureDate = (offsetDays = 7) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offsetDays);
    return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
};

// Devuelve el día UTC de una fecha ISO string
const utcDay = (isoDate) => new Date(isoDate).getUTCDay();

// Construye un payload válido que genere ~2 días × 8 slots = 16 slots
const validPayload = (doctorId) => {
    const start = futureDate(7);
    const end = futureDate(13); // +6 días = 1 semana
    const startUTCDay = utcDay(start + 'T00:00:00Z');
    // Tomamos dos días dentro del rango (el día de inicio y el siguiente)
    const day1 = startUTCDay;           // 0–6
    const day2 = (startUTCDay + 1) % 7;
    return {
        doctorId,
        startDate: start,
        endDate: end,
        daysOfWeek: [day1, day2],
        startHour: 8,
        endHour: 16,  // 8 horas → 8 slots de 60 min
        slotDurationMin: 60,
    };
};

beforeAll(async () => {
    await deleteTestUsers();
    users = await createTestUsers();
    tokens.admin   = await getToken(users.admin.email);
    tokens.patient = await getToken(users.patient.email);
});

afterAll(async () => {
    // Limpiar todos los time blocks del doctor de test
    if (users.doctor?.id) {
        await prisma.timeBlock.deleteMany({ where: { doctorId: users.doctor.id } });
    }
    await deleteTestUsers();
    await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Casos exitosos
// ---------------------------------------------------------------------------
describe('POST /api/admin/time-blocks/bulk — éxito', () => {
    it('crea N slots y devuelve { created, skipped, total }', async () => {
        const payload = validPayload(users.doctor.id);
        const res = await request(app)
            .post('/api/admin/time-blocks/bulk')
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('created');
        expect(res.body).toHaveProperty('skipped');
        expect(res.body).toHaveProperty('total');
        expect(res.body.created).toBeGreaterThan(0);
        expect(res.body.created + res.body.skipped).toBe(res.body.total);
    });

    it('segunda request con mismo payload → skipped = total (skipDuplicates)', async () => {
        const payload = validPayload(users.doctor.id);

        // Primera vez (puede tener algunos ya creados del test anterior)
        await request(app)
            .post('/api/admin/time-blocks/bulk')
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send(payload);

        // Segunda vez: todos ya existen
        const res = await request(app)
            .post('/api/admin/time-blocks/bulk')
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.skipped).toBe(res.body.total);
        expect(res.body.created).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Validaciones de negocio
// ---------------------------------------------------------------------------
describe('POST /api/admin/time-blocks/bulk — validaciones', () => {
    it('slotDuration no divide exactamente el rango horario → 400', async () => {
        const res = await request(app)
            .post('/api/admin/time-blocks/bulk')
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({
                ...validPayload(users.doctor.id),
                startHour: 9,
                endHour: 16,   // 7 horas = 420 min; 420 % 50 !== 0
                slotDurationMin: 50,
            });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_SLOT_DURATION');
    });

    it('startDate > endDate → 400 (Joi)', async () => {
        const res = await request(app)
            .post('/api/admin/time-blocks/bulk')
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({
                ...validPayload(users.doctor.id),
                startDate: futureDate(10),
                endDate: futureDate(5),
            });

        expect(res.status).toBe(400);
    });

    it('daysOfWeek vacío → 400 (Joi)', async () => {
        const res = await request(app)
            .post('/api/admin/time-blocks/bulk')
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({ ...validPayload(users.doctor.id), daysOfWeek: [] });

        expect(res.status).toBe(400);
    });

    it('doctorId de usuario que no es doctor → 400', async () => {
        const res = await request(app)
            .post('/api/admin/time-blocks/bulk')
            .set('Authorization', `Bearer ${tokens.admin}`)
            .send({ ...validPayload(users.patient.id) });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('NOT_A_DOCTOR');
    });

    it('no-admin → 403', async () => {
        const res = await request(app)
            .post('/api/admin/time-blocks/bulk')
            .set('Authorization', `Bearer ${tokens.patient}`)
            .send(validPayload(users.doctor.id));

        expect(res.status).toBe(403);
    });

    it('sin auth → 401', async () => {
        const res = await request(app)
            .post('/api/admin/time-blocks/bulk')
            .send(validPayload(users.doctor.id));

        expect(res.status).toBe(401);
    });
});
