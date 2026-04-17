/**
 * Integration tests for POST /api/doctors/me/photo
 *
 * Cloudinary is mocked — no network calls are made.
 * We verify:
 *   - Successful upload → 200, photoUrl persisted in DB
 *   - Authorization (only DOCTOR role)
 *   - File validation (missing file, wrong type, too large)
 */

// Mock cloudinary BEFORE importing app (module evaluation order matters)
jest.mock('../src/utils/cloudinary', () => ({
    uploadBuffer: jest.fn().mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/test/image/upload/doctor-photos/test.jpg',
        public_id:  'doctor-photos/test',
    }),
}));

const request = require('supertest');
const path    = require('path');
const app     = require('../src/app');
const prisma  = require('../src/utils/prismaClient');
const { uploadBuffer } = require('../src/utils/cloudinary');
const { createTestUsers, deleteTestUsers, TEST_PASSWORD } = require('./helpers/setupUsers');

let users  = {};
let tokens = {};

const getToken = async (email) => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: TEST_PASSWORD });
    return res.body.token;
};

/** Small valid JPEG (1×1 pixel) — avoids creating large fixtures */
const TINY_JPEG = Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U' +
    'HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN' +
    'DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy' +
    'MjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAA' +
    'AAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA' +
    '/9oADAMBAAIRAxEAPwCwABmX/9k=',
    'base64',
);

beforeAll(async () => {
    await deleteTestUsers();
    users = await createTestUsers();

    await prisma.doctorProfile.upsert({
        where:  { userId: users.doctor.id },
        update: {},
        create: { userId: users.doctor.id, specialty: 'General', specialties: ['General'] },
    });

    tokens.patient = await getToken(users.patient.email);
    tokens.doctor  = await getToken(users.doctor.email);
});

afterAll(async () => {
    await prisma.doctorProfile.deleteMany({ where: { userId: users.doctor?.id } });
    await deleteTestUsers();
    await prisma.$disconnect();
});

beforeEach(() => {
    uploadBuffer.mockClear();
});

// ---------------------------------------------------------------------------
describe('POST /api/doctors/me/photo', () => {
    it('doctor sube JPG válido → 200, photoUrl guardado en DB', async () => {
        const res = await request(app)
            .post('/api/doctors/me/photo')
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .attach('file', TINY_JPEG, { filename: 'photo.jpg', contentType: 'image/jpeg' });

        expect(res.status).toBe(200);
        expect(res.body.photoUrl).toBe(
            'https://res.cloudinary.com/test/image/upload/doctor-photos/test.jpg',
        );
        expect(uploadBuffer).toHaveBeenCalledTimes(1);

        // Verifica que realmente se persistió en la DB
        const profile = await prisma.doctorProfile.findUnique({ where: { userId: users.doctor.id } });
        expect(profile.photoUrl).toBe(res.body.photoUrl);
    });

    it('doctor sube PNG válido → 200', async () => {
        const res = await request(app)
            .post('/api/doctors/me/photo')
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .attach('file', TINY_JPEG, { filename: 'photo.png', contentType: 'image/png' });

        expect(res.status).toBe(200);
    });

    it('patient intenta subir → 403', async () => {
        const res = await request(app)
            .post('/api/doctors/me/photo')
            .set('Authorization', `Bearer ${tokens.patient}`)
            .attach('file', TINY_JPEG, { filename: 'photo.jpg', contentType: 'image/jpeg' });

        expect(res.status).toBe(403);
    });

    it('sin token → 401', async () => {
        const res = await request(app)
            .post('/api/doctors/me/photo')
            .attach('file', TINY_JPEG, { filename: 'photo.jpg', contentType: 'image/jpeg' });

        expect(res.status).toBe(401);
    });

    it('sin archivo en el body → 400', async () => {
        // No adjuntamos nada — multer deja req.file = undefined → controller devuelve 400
        const res = await request(app)
            .post('/api/doctors/me/photo')
            .set('Authorization', `Bearer ${tokens.doctor}`);

        expect(res.status).toBe(400);
    });

    it('archivo de tipo .txt → 400 INVALID_FILE_TYPE', async () => {
        const txtBuffer = Buffer.from('esto no es una imagen');
        const res = await request(app)
            .post('/api/doctors/me/photo')
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .attach('file', txtBuffer, { filename: 'doc.txt', contentType: 'text/plain' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_FILE_TYPE');
    });

    it('archivo mayor a 5 MB → 400 FILE_TOO_LARGE', async () => {
        const bigBuffer = Buffer.alloc(6 * 1024 * 1024); // 6 MB
        const res = await request(app)
            .post('/api/doctors/me/photo')
            .set('Authorization', `Bearer ${tokens.doctor}`)
            .attach('file', bigBuffer, { filename: 'big.jpg', contentType: 'image/jpeg' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('FILE_TOO_LARGE');
    });
});
