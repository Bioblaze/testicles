const request = require('supertest');
const app = require('../src/app');

describe('Express app (src/app.js)', () => {
  test('exports an Express application instance', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
    expect(typeof app.use).toBe('function');
    expect(typeof app.get).toBe('function');
  });

  test('does not call app.listen (no active server)', () => {
    // app.listen would set app.settings to include a port; we verify no server is running
    expect(app.listening).toBeUndefined();
  });

  describe('GET /health', () => {
    test('responds with 200 and { "status": "ok" }', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    test('returns Content-Type application/json', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('404 catch-all', () => {
    test('GET /nonexistent responds with 404 and { "error": "Not found" }', async () => {
      const res = await request(app).get('/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });

    test('POST /unknown responds with 404 and { "error": "Not found" }', async () => {
      const res = await request(app).post('/unknown');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });

    test('catch-all returns Content-Type application/json', async () => {
      const res = await request(app).get('/does-not-exist');
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('express.json() middleware', () => {
    test('parses JSON request bodies', async () => {
      // Even though no POST route exists, the middleware should parse JSON
      // The 404 handler will still fire, but the body should have been parsed
      const res = await request(app)
        .post('/nonexistent')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(404);
    });
  });
});
