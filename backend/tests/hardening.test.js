/**
 * Integration tests for P3 hardening: health check, CORS, body limit,
 * Prisma error mapping, malformed JSON.
 */
const request = require('supertest');
const app = require('../src/app');

describe('Health check', () => {
    it('GET /health → 200 ok', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });
});

describe('CORS headers', () => {
    it('responds with Access-Control-Allow-Origin for allowed origin', async () => {
        const res = await request(app)
            .get('/health')
            .set('Origin', 'http://localhost:5173');
        expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
});

describe('Body limit', () => {
    it('rejects payload larger than 16kb → 413', async () => {
        const big = JSON.stringify({ data: 'x'.repeat(20000) });
        const res = await request(app)
            .post('/api/auth/login')
            .set('Content-Type', 'application/json')
            .send(big);
        expect(res.status).toBe(413);
    });
});

describe('Malformed JSON', () => {
    it('rejects invalid JSON → 400', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .set('Content-Type', 'application/json')
            .send('{invalid json}');
        expect(res.status).toBe(400);
    });
});
