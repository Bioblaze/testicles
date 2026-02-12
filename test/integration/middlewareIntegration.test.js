const request = require('supertest');
const app = require('../../src/app');

describe('Middleware integration (src/app.js)', () => {
  describe('helmet security headers', () => {
    test('GET /health response includes helmet security headers', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      // helmet sets various security headers
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });

    test('404 responses include helmet security headers', async () => {
      const res = await request(app).get('/nonexistent-route');
      expect(res.status).toBe(404);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });

    test('error responses include helmet security headers', async () => {
      const res = await request(app)
        .post('/books')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      expect(res.status).toBe(400);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });

    test('security headers are present on all response types', async () => {
      const endpoints = [
        { method: 'get', path: '/health' },
        { method: 'get', path: '/books' },
        { method: 'get', path: '/unknown-path' },
      ];

      for (const { method, path } of endpoints) {
        const res = await request(app)[method](path);
        expect(res.headers['x-content-type-options']).toBe('nosniff');
      }
    });
  });

  describe('malformed JSON handling', () => {
    test('malformed JSON body returns 400, not 500', async () => {
      const res = await request(app)
        .post('/books')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Malformed JSON in request body' });
    });

    test('malformed JSON error response has consistent { error: string } shape', async () => {
      const res = await request(app)
        .post('/books')
        .set('Content-Type', 'application/json')
        .send('not valid json at all');
      expect(res.status).toBe(400);
      expect(Object.keys(res.body)).toEqual(['error']);
      expect(typeof res.body.error).toBe('string');
    });

    test('malformed JSON error response includes security headers', async () => {
      const res = await request(app)
        .post('/books')
        .set('Content-Type', 'application/json')
        .send('{bad}');
      expect(res.status).toBe(400);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('404 catch-all', () => {
    test('unknown GET route returns 404 with JSON error', async () => {
      const res = await request(app).get('/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });

    test('unknown POST route returns 404 with JSON error', async () => {
      const res = await request(app).post('/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });

    test('unknown PUT route returns 404 with JSON error', async () => {
      const res = await request(app).put('/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });

    test('unknown DELETE route returns 404 with JSON error', async () => {
      const res = await request(app).delete('/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });
  });

  describe('existing routes remain functional', () => {
    test('GET /health still returns 200 with { status: "ok" }', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    test('GET /books returns 200', async () => {
      const res = await request(app).get('/books');
      expect(res.status).toBe(200);
    });
  });

  describe('middleware ordering', () => {
    test('helmet is registered before routes (security headers on success responses)', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    test('express.json() is registered before routes (body parsing works)', async () => {
      const res = await request(app)
        .post('/books')
        .send({ title: 'Test', author: 'Author', isbn: '1234567890123' })
        .set('Content-Type', 'application/json');
      // Should not be a 500 — body was parsed
      expect(res.status).not.toBe(500);
    });

    test('errorHandler is the last middleware (catches malformed JSON errors)', async () => {
      const res = await request(app)
        .post('/books')
        .set('Content-Type', 'application/json')
        .send('{{{{');
      // The centralized errorHandler catches the SyntaxError and returns 400
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Malformed JSON in request body');
    });
  });
});
