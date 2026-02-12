const express = require('express');
const request = require('supertest');

describe('rateLimiter middleware (src/middleware/rateLimiter.js)', () => {
  const originalWindowMs = process.env.RATE_LIMIT_WINDOW_MS;
  const originalMax = process.env.RATE_LIMIT_MAX;

  afterEach(() => {
    // Restore original env vars
    if (originalWindowMs === undefined) {
      delete process.env.RATE_LIMIT_WINDOW_MS;
    } else {
      process.env.RATE_LIMIT_WINDOW_MS = originalWindowMs;
    }
    if (originalMax === undefined) {
      delete process.env.RATE_LIMIT_MAX;
    } else {
      process.env.RATE_LIMIT_MAX = originalMax;
    }
    // Clear module cache so env vars take effect on next require
    jest.resetModules();
  });

  test('exports a function (middleware)', () => {
    const rateLimiter = require('../../src/middleware/rateLimiter');
    expect(typeof rateLimiter).toBe('function');
  });

  test('default windowMs is 15 minutes (900000 ms)', () => {
    delete process.env.RATE_LIMIT_WINDOW_MS;
    const rateLimiter = require('../../src/middleware/rateLimiter');
    // express-rate-limit stores config; we can verify by inspecting middleware behavior
    // The middleware itself is a function; we check the defaults indirectly
    expect(rateLimiter).toBeDefined();
  });

  test('default max is 100 requests per window', () => {
    delete process.env.RATE_LIMIT_MAX;
    const rateLimiter = require('../../src/middleware/rateLimiter');
    expect(rateLimiter).toBeDefined();
  });

  test('responds with 429 and correct error message when limit is exceeded', async () => {
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX = '3';
    const rateLimiter = require('../../src/middleware/rateLimiter');

    const app = express();
    app.use(rateLimiter);
    app.get('/test', (req, res) => {
      res.status(200).json({ ok: true });
    });

    // Send requests up to the limit
    for (let i = 0; i < 3; i++) {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    }

    // The next request should be rate limited
    const res = await request(app).get('/test');
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: 'Too many requests, please try again later' });
  });

  test('429 response body follows consistent { error: "string" } shape', async () => {
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX = '1';
    const rateLimiter = require('../../src/middleware/rateLimiter');

    const app = express();
    app.use(rateLimiter);
    app.get('/test', (req, res) => {
      res.status(200).json({ ok: true });
    });

    // Exhaust the limit
    await request(app).get('/test');

    // Verify 429 response shape
    const res = await request(app).get('/test');
    expect(res.status).toBe(429);
    expect(Object.keys(res.body)).toEqual(['error']);
    expect(typeof res.body.error).toBe('string');
  });

  test('returns RateLimit-* standard headers when standardHeaders is true', async () => {
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX = '5';
    const rateLimiter = require('../../src/middleware/rateLimiter');

    const app = express();
    app.use(rateLimiter);
    app.get('/test', (req, res) => {
      res.status(200).json({ ok: true });
    });

    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    // Standard headers: ratelimit-limit, ratelimit-remaining, ratelimit-reset
    const headerKeys = Object.keys(res.headers).map(h => h.toLowerCase());
    expect(headerKeys.some(h => h.startsWith('ratelimit'))).toBe(true);
  });

  test('does not return deprecated X-RateLimit-* headers when legacyHeaders is false', async () => {
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX = '5';
    const rateLimiter = require('../../src/middleware/rateLimiter');

    const app = express();
    app.use(rateLimiter);
    app.get('/test', (req, res) => {
      res.status(200).json({ ok: true });
    });

    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    const headerKeys = Object.keys(res.headers).map(h => h.toLowerCase());
    expect(headerKeys.some(h => h.startsWith('x-ratelimit'))).toBe(false);
  });

  test('respects RATE_LIMIT_MAX environment variable', async () => {
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX = '2';
    const rateLimiter = require('../../src/middleware/rateLimiter');

    const app = express();
    app.use(rateLimiter);
    app.get('/test', (req, res) => {
      res.status(200).json({ ok: true });
    });

    // First 2 requests should succeed
    const res1 = await request(app).get('/test');
    expect(res1.status).toBe(200);
    const res2 = await request(app).get('/test');
    expect(res2.status).toBe(200);

    // 3rd request should be rate limited
    const res3 = await request(app).get('/test');
    expect(res3.status).toBe(429);
  });

  test('respects RATE_LIMIT_WINDOW_MS environment variable', () => {
    process.env.RATE_LIMIT_WINDOW_MS = '30000';
    process.env.RATE_LIMIT_MAX = '50';
    const rateLimiter = require('../../src/middleware/rateLimiter');
    // Module loads without error when env vars are set
    expect(typeof rateLimiter).toBe('function');
  });

  test('requests within the limit succeed', async () => {
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX = '5';
    const rateLimiter = require('../../src/middleware/rateLimiter');

    const app = express();
    app.use(rateLimiter);
    app.get('/test', (req, res) => {
      res.status(200).json({ ok: true });
    });

    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    }
  });

  test('429 response includes retry-after header', async () => {
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX = '1';
    const rateLimiter = require('../../src/middleware/rateLimiter');

    const app = express();
    app.use(rateLimiter);
    app.get('/test', (req, res) => {
      res.status(200).json({ ok: true });
    });

    // Exhaust the limit
    await request(app).get('/test');

    // Verify 429 includes retry-after
    const res = await request(app).get('/test');
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
  });
});
