/**
 * Tests for POST /api/users/me/photo
 *
 * Cloudinary is mocked — no real uploads.
 */
jest.mock('../src/utils/cloudinary', () => ({
    uploadBuffer: jest.fn().mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/test/image/upload/user-avatars/user-1.jpg',
        public_id:  'user-avatars/user-1',
    }),
}));

const request  = require('supertest');
const app      = require('../src/app');
const prisma   = require('../src/utils/prismaClient');
const { uploadBuffer } = require('../src/utils/cloudinary');
const { createTestUsers, deleteTestUsers, TEST_PASSWORD } = require('./helpers/setupUsers');

let users = {};
let patientToken = '';

const getToken = async (email) => {
    const res = await request(app).post('/api/auth/login').send({ email, password: TEST_PASSWORD });
    return res.body.token;
};

beforeAll(async () => {
    await deleteTestUsers();
    users = await createTestUsers();
    patientToken = await getToken(users.patient.email);
});

afterAll(async () => {
    await deleteTestUsers();
    await prisma.$disconnect();
});

beforeEach(() => {
    uploadBuffer.mockClear();
});

// ─── Tests ─────────────────────────────────────────────────────────────────

it('patient sube foto → 200 y photoUrl persiste en DB', async () => {
    const res = await request(app)
        .post('/api/users/me/photo')
        .set('Authorization', `Bearer ${patientToken}`)
        .attach('file', Buffer.from('fake-image-data'), { filename: 'avatar.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('photoUrl');
    expect(typeof res.body.photoUrl).toBe('string');

    // Verificar que persistió en DB
    const dbUser = await prisma.user.findUnique({ where: { id: users.patient.id } });
    expect(dbUser.photoUrl).toBe(res.body.photoUrl);
});

it('re-subir foto → uploadBuffer llamado con overwrite:true y mismo public_id', async () => {
    await request(app)
        .post('/api/users/me/photo')
        .set('Authorization', `Bearer ${patientToken}`)
        .attach('file', Buffer.from('new-image'), { filename: 'new.jpg', contentType: 'image/jpeg' });

    expect(uploadBuffer).toHaveBeenCalledWith(
        expect.any(Buffer),
        'user-avatars',
        expect.objectContaining({ public_id: `user-${users.patient.id}`, overwrite: true }),
    );
});

it('archivo > 5MB → 400', async () => {
    const bigFile = Buffer.alloc(6 * 1024 * 1024); // 6 MB
    const res = await request(app)
        .post('/api/users/me/photo')
        .set('Authorization', `Bearer ${patientToken}`)
        .attach('file', bigFile, { filename: 'big.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
});

it('archivo no-imagen → 400', async () => {
    const res = await request(app)
        .post('/api/users/me/photo')
        .set('Authorization', `Bearer ${patientToken}`)
        .attach('file', Buffer.from('not-an-image'), { filename: 'doc.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(400);
});

it('sin auth → 401', async () => {
    const res = await request(app)
        .post('/api/users/me/photo')
        .attach('file', Buffer.from('data'), { filename: 'img.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(401);
});
