const request = require('supertest');
const app = require('../../src/app');

const NON_EXISTENT_UUID = '00000000-0000-4000-8000-000000000000';

describe('GET /books/:id', () => {
  let seededBook;

  beforeEach(async () => {
    app.locals.db.exec('DELETE FROM checkout_history');
    app.locals.db.exec('DELETE FROM books');

    const res = await request(app)
      .post('/books')
      .send({
        title: 'Test Book',
        author: 'Test Author',
        isbn: '978-3-16-148410-0',
        published_year: 2023,
      });
    seededBook = res.body;
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

  test('returns 200 with the correct book for a valid existing ID', async () => {
    const res = await request(app).get(`/books/${seededBook.id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(seededBook.id);
    expect(res.body.title).toBe('Test Book');
    expect(res.body.author).toBe('Test Author');
    expect(res.body.isbn).toBe('978-3-16-148410-0');
    expect(res.body.published_year).toBe(2023);
  });

  test('returns 404 with { error: "Book not found" } for a valid UUID that does not exist', async () => {
    const res = await request(app).get(`/books/${NON_EXISTENT_UUID}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Book not found' });
  });

  test('response body contains all book schema fields', async () => {
    const res = await request(app).get(`/books/${seededBook.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('title');
    expect(res.body).toHaveProperty('author');
    expect(res.body).toHaveProperty('isbn');
    expect(res.body).toHaveProperty('published_year');
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('checked_out_at');
    expect(res.body).toHaveProperty('created_at');
    expect(res.body).toHaveProperty('updated_at');
  });

  test('status field reflects "available" for a newly created book', async () => {
    const res = await request(app).get(`/books/${seededBook.id}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('available');
  });

  test('checked_out_at is null for an available book', async () => {
    const res = await request(app).get(`/books/${seededBook.id}`);

    expect(res.status).toBe(200);
    expect(res.body.checked_out_at).toBeNull();
  });
});
