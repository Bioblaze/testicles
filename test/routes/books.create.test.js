const express = require('express');
const request = require('supertest');
const { getDatabase } = require('../../src/db/connection');
const { migrate } = require('../../src/db/migrate');
const booksRouter = require('../../src/routes/books');
const Book = require('../../src/models/book');

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createApp(db) {
  const app = express();
  app.use(express.json());
  app.locals.db = db;
  app.use('/books', booksRouter);
  return app;
}

const validBook = {
  title: 'The Great Gatsby',
  author: 'F. Scott Fitzgerald',
  isbn: '978-0-7432-7356-5',
  published_year: 1925,
};

describe('POST /books', () => {
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

  test('valid payload creates a book and returns 201 with all fields including UUID id, status available, created_at, and updated_at', async () => {
    const res = await request(app)
      .post('/books')
      .send(validBook)
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(uuidV4Regex);
    expect(res.body.title).toBe(validBook.title);
    expect(res.body.author).toBe(validBook.author);
    expect(res.body.isbn).toBe(validBook.isbn);
    expect(res.body.published_year).toBe(validBook.published_year);
    expect(res.body.status).toBe('available');
    expect(res.body.created_at).toBeDefined();
    expect(res.body.updated_at).toBeDefined();
  });

  test('missing title returns 400 with error referencing title', async () => {
    const { title, ...body } = validBook;
    const res = await request(app)
      .post('/books')
      .send(body)
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    const titleError = res.body.errors.find(e => e.field === 'title');
    expect(titleError).toBeDefined();
    expect(titleError.message).toBe('Title is required');
  });

  test('missing author returns 400 with error referencing author', async () => {
    const { author, ...body } = validBook;
    const res = await request(app)
      .post('/books')
      .send(body)
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    const authorError = res.body.errors.find(e => e.field === 'author');
    expect(authorError).toBeDefined();
    expect(authorError.message).toBe('Author is required');
  });

  test('invalid ISBN format returns 400 with error referencing isbn', async () => {
    const res = await request(app)
      .post('/books')
      .send({ ...validBook, isbn: 'not-a-valid-isbn' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    const isbnError = res.body.errors.find(e => e.field === 'isbn');
    expect(isbnError).toBeDefined();
    expect(isbnError.message).toBe('ISBN must be a valid ISBN-10 or ISBN-13');
  });

  test('published_year below 1000 returns 400', async () => {
    const res = await request(app)
      .post('/books')
      .send({ ...validBook, published_year: 999 })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    const yearError = res.body.errors.find(e => e.field === 'published_year');
    expect(yearError).toBeDefined();
  });

  test('published_year in the future (9999) returns 400', async () => {
    const res = await request(app)
      .post('/books')
      .send({ ...validBook, published_year: 9999 })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    const yearError = res.body.errors.find(e => e.field === 'published_year');
    expect(yearError).toBeDefined();
  });

  test('empty body returns 400 with errors for all four required fields', async () => {
    const res = await request(app)
      .post('/books')
      .send({})
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    const fields = res.body.errors.map(e => e.field);
    expect(fields).toContain('title');
    expect(fields).toContain('author');
    expect(fields).toContain('isbn');
    expect(fields).toContain('published_year');
  });

  test('duplicate ISBN returns 409 with correct error message', async () => {
    await request(app)
      .post('/books')
      .send(validBook)
      .set('Content-Type', 'application/json');

    const res = await request(app)
      .post('/books')
      .send({ ...validBook, title: 'Another Book', author: 'Another Author' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('A book with this ISBN already exists');
  });

  test('response includes expected default fields (id, created_at, updated_at, status: available, checked_out_at: null)', async () => {
    const res = await request(app)
      .post('/books')
      .send(validBook)
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('created_at');
    expect(res.body).toHaveProperty('updated_at');
    expect(res.body.status).toBe('available');
    expect(res.body.checked_out_at).toBeNull();
  });
});
