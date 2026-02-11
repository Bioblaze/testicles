const express = require('express');
const request = require('supertest');
const healthRouter = require('../src/routes/health');

function createApp() {
  const app = express();
  app.use(healthRouter);
  return app;
}

describe('GET /health', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  test('responds with HTTP status 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  test('responds with JSON body { "status": "ok" }', async () => {
    const res = await request(app).get('/health');
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('Content-Type header is application/json', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

describe('health route module', () => {
  test('src/routes/health.js exists and is a valid Node.js module', () => {
    expect(() => require('../src/routes/health')).not.toThrow();
  });

  test('exports an Express Router instance', () => {
    const router = require('../src/routes/health');
    // Express routers are functions with a stack property
    expect(typeof router).toBe('function');
    expect(router.stack).toBeDefined();
    expect(Array.isArray(router.stack)).toBe(true);
  });

  test('router defines a GET /health route', () => {
    const router = require('../src/routes/health');
    const healthLayer = router.stack.find(
      (layer) => layer.route && layer.route.path === '/health'
    );
    expect(healthLayer).toBeDefined();
    expect(healthLayer.route.methods.get).toBe(true);
  });

  test('module does not call app.listen() or create its own Express app', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '..', 'src', 'routes', 'health.js'),
      'utf-8'
    );
    expect(source).not.toMatch(/app\.listen/);
    expect(source).not.toMatch(/express\(\)/);
  });
});
