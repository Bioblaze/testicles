const express = require('express');
const request = require('supertest');
const { getDatabase } = require('../../src/db/connection');
const { migrate } = require('../../src/db/migrate');
const booksRouter = require('../../src/routes/books');

function createApp(db) {
  const app = express();
  app.use(express.json());
  app.locals.db = db;
  app.use('/books', booksRouter);
  return app;
}

describe('GET /books/:id', () => {
  let db;
  let app;

  beforeEach(() => {
    db = getDatabase(':memory:');
    migrate(db);
    app = createApp(db);
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  test('returns 400 with structured validation error for non-UUID string "not-a-uuid"', async () => {
    const res = await request(app).get('/books/not-a-uuid');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors).toEqual([
      { field: 'id', message: 'ID must be a valid UUID v4' },
    ]);
  });

  test('returns 400 with structured validation error for numeric ID "12345"', async () => {
    const res = await request(app).get('/books/12345');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors).toEqual([
      { field: 'id', message: 'ID must be a valid UUID v4' },
    ]);
  });

  test('does not return 400 for a valid UUID v4', async () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    const res = await request(app).get(`/books/${validUuid}`);

    // Should not be a 400 validation error — it passes validation
    expect(res.status).not.toBe(400);
  });

  test('GET /:id route exists after the GET / list route', async () => {
    // The list route should still work fine
    const listRes = await request(app).get('/books');
    expect(listRes.status).toBe(200);

    // And the :id route with invalid ID should return 400 (not 404)
    const idRes = await request(app).get('/books/invalid-id');
    expect(idRes.status).toBe(400);
  });
});
