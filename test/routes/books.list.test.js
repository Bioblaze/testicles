const express = require('express');
const request = require('supertest');
const { getDatabase } = require('../../src/db/connection');
const { migrate } = require('../../src/db/migrate');
const booksRouter = require('../../src/routes/books');
const Book = require('../../src/models/book');

function createApp(db) {
  const app = express();
  app.use(express.json());
  app.locals.db = db;
  app.use('/books', booksRouter);
  return app;
}

function seedBooks(db, count) {
  const books = [];
  for (let i = 1; i <= count; i++) {
    const book = Book.create(db, {
      title: `Book ${i}`,
      author: `Author ${i}`,
      isbn: `978-0-0000-0000-${String(i).padStart(1, '0')}`,
      published_year: 2000 + (i % 25),
    });
    books.push(book);
  }
  return books;
}

describe('GET /books', () => {
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

  test('returns empty data array and total: 0 when no books exist', async () => {
    const res = await request(app).get('/books');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  test('returns seeded books with 20 items in data and pagination.total of 25', async () => {
    seedBooks(db, 25);

    const res = await request(app).get('/books');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(20);
    expect(res.body.pagination.total).toBe(25);
  });

  test('pagination defaults are applied (page: 1, limit: 20)', async () => {
    seedBooks(db, 25);

    const res = await request(app).get('/books');

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(20);
  });

  test('custom page=2 and limit=10 returns 10 items with correct pagination', async () => {
    seedBooks(db, 25);

    const res = await request(app).get('/books?page=2&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(10);
    expect(res.body.pagination.page).toBe(2);
    expect(res.body.pagination.limit).toBe(10);
    expect(res.body.pagination.total).toBe(25);
  });

  test('limit is capped at 100 when limit=200 is requested', async () => {
    seedBooks(db, 5);

    const res = await request(app).get('/books?limit=200');

    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(20);
  });

  test('response includes data (array) and pagination object with page, limit, total', async () => {
    seedBooks(db, 3);

    const res = await request(app).get('/books');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination).toHaveProperty('page');
    expect(res.body.pagination).toHaveProperty('limit');
    expect(res.body.pagination).toHaveProperty('total');
  });

  test('invalid page=-1 falls back to default page: 1', async () => {
    seedBooks(db, 5);

    const res = await request(app).get('/books?page=-1');

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
  });

  test('invalid limit=abc falls back to default limit: 20', async () => {
    seedBooks(db, 5);

    const res = await request(app).get('/books?limit=abc');

    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(20);
  });
});
