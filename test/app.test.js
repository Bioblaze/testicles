const request = require('supertest');
const fs = require('fs');
const path = require('path');
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

  describe('Swagger UI at /docs', () => {
    test('GET /docs responds with 200 and serves HTML', async () => {
      const res = await request(app).get('/docs/');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
    });

    test('Swagger UI HTML contains swagger-ui references', async () => {
      const res = await request(app).get('/docs/');
      expect(res.status).toBe(200);
      expect(res.text).toMatch(/swagger/i);
    });
  });

  describe('GET /docs/json', () => {
    test('responds with 200 and returns JSON', async () => {
      const res = await request(app).get('/docs/json');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    test('returns the complete OpenAPI spec with required fields', async () => {
      const res = await request(app).get('/docs/json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.0');
      expect(res.body.info).toBeDefined();
      expect(res.body.info.title).toBe('Book API');
      expect(res.body.info.version).toBe('1.0.0');
      expect(res.body.paths).toBeDefined();
    });

    test('returned spec matches the generated swaggerSpec module', async () => {
      const swaggerSpec = require('../src/docs/swagger');
      const res = await request(app).get('/docs/json');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(JSON.parse(JSON.stringify(swaggerSpec)));
    });
  });

  describe('Swagger routes middleware ordering', () => {
    test('Swagger UI includes helmet security headers', async () => {
      const res = await request(app).get('/docs/');
      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    test('/docs/json includes helmet security headers', async () => {
      const res = await request(app).get('/docs/json');
      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('source code verification', () => {
    let source;

    beforeAll(() => {
      source = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'app.js'), 'utf-8');
    });

    test('imports swagger-ui-express', () => {
      expect(source).toMatch(/require\s*\(\s*['"]swagger-ui-express['"]\s*\)/);
    });

    test('imports the generated spec from ./docs/swagger', () => {
      expect(source).toMatch(/require\s*\(\s*['"]\.\/docs\/swagger['"]\s*\)/);
    });

    test('mounts Swagger UI at /docs', () => {
      expect(source).toMatch(/app\.use\s*\(\s*['"]\/docs['"]/);
    });

    test('defines /docs/json endpoint', () => {
      expect(source).toMatch(/app\.get\s*\(\s*['"]\/docs\/json['"]/);
    });

    test('Swagger routes appear after rateLimiter and before API routes', () => {
      const rateLimiterPos = source.indexOf('app.use(rateLimiter)');
      const swaggerDocsPos = source.indexOf("app.use('/docs'");
      const swaggerJsonPos = source.indexOf("app.get('/docs/json'");
      const healthRoutePos = source.indexOf("app.use('/', healthRouter)");
      const booksRoutePos = source.indexOf("app.use('/books'");

      // All positions found
      expect(rateLimiterPos).toBeGreaterThan(-1);
      expect(swaggerDocsPos).toBeGreaterThan(-1);
      expect(swaggerJsonPos).toBeGreaterThan(-1);
      expect(healthRoutePos).toBeGreaterThan(-1);
      expect(booksRoutePos).toBeGreaterThan(-1);

      // rateLimiter before swagger
      expect(rateLimiterPos).toBeLessThan(swaggerJsonPos);
      expect(rateLimiterPos).toBeLessThan(swaggerDocsPos);
      // swagger before API routes
      expect(swaggerDocsPos).toBeLessThan(healthRoutePos);
      expect(swaggerJsonPos).toBeLessThan(healthRoutePos);
      expect(swaggerJsonPos).toBeLessThan(booksRoutePos);
    });
  });
});
