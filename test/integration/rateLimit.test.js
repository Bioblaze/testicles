const express = require('express');
const rateLimit = require('express-rate-limit');
const request = require('supertest');

/**
 * Creates a minimal Express app with a low rate limit for deterministic testing.
 * Each call returns a fresh instance so rate-limiter state is isolated per test.
 */
function createTestApp() {
  const app = express();
  app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  }));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  return app;
}

describe('Rate limiting integration tests', () => {
  test('should allow requests within the rate limit', async () => {
    const app = createTestApp();
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    }
  });

  test('should return 429 when rate limit is exceeded', async () => {
    const app = createTestApp();
    for (let i = 0; i < 5; i++) {
      await request(app).get('/health');
    }
    const res = await request(app).get('/health');
    expect(res.status).toBe(429);
  });

  test('should include retry-after header when rate limit is exceeded', async () => {
    const app = createTestApp();
    for (let i = 0; i < 5; i++) {
      await request(app).get('/health');
    }
    const res = await request(app).get('/health');
    expect(res.headers).toHaveProperty('retry-after');
  });

  test('should return correct JSON error body when rate limit is exceeded', async () => {
    const app = createTestApp();
    for (let i = 0; i < 5; i++) {
      await request(app).get('/health');
    }
    const res = await request(app).get('/health');
    expect(res.body).toEqual({ error: 'Too many requests, please try again later' });
  });
});
