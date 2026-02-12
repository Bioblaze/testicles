const request = require('supertest');
const app = require('../../src/app');

const NON_EXISTENT_UUID = '00000000-0000-4000-a000-000000000000';

describe('GET /books/:id/history', () => {
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

  test('returns 400 with structured validation error for malformed UUID', async () => {
    const res = await request(app).get('/books/not-a-uuid/history');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors).toEqual([
      { field: 'id', message: 'ID must be a valid UUID v4' },
    ]);
  });

  test('returns 400 with structured validation error for numeric ID', async () => {
    const res = await request(app).get('/books/12345/history');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors).toEqual([
      { field: 'id', message: 'ID must be a valid UUID v4' },
    ]);
  });

  test('returns 404 with error message for non-existent book UUID', async () => {
    const res = await request(app).get(`/books/${NON_EXISTENT_UUID}/history`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Book not found' });
  });

  test('returns 200 with empty data array and total 0 for book with no history', async () => {
    const res = await request(app).get(`/books/${seededBook.id}/history`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 0 });
  });

  test('defaults page to 1 and limit to 20 when not provided', async () => {
    const res = await request(app).get(`/books/${seededBook.id}/history`);

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(20);
  });

  test('returns history entries after checkout and return', async () => {
    // Checkout then return the book to create history entries
    await request(app).post(`/books/${seededBook.id}/checkout`);
    await request(app).post(`/books/${seededBook.id}/return`);

    const res = await request(app).get(`/books/${seededBook.id}/history`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
  });

  test('returns entries in reverse chronological order (newest first)', async () => {
    await request(app).post(`/books/${seededBook.id}/checkout`);
    await request(app).post(`/books/${seededBook.id}/return`);

    const res = await request(app).get(`/books/${seededBook.id}/history`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    // Newest first: returned action should come before checked_out
    expect(res.body.data[0].action).toBe('returned');
    expect(res.body.data[1].action).toBe('checked_out');
  });

  test('history entries contain expected fields', async () => {
    await request(app).post(`/books/${seededBook.id}/checkout`);

    const res = await request(app).get(`/books/${seededBook.id}/history`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    const entry = res.body.data[0];
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('book_id', seededBook.id);
    expect(entry).toHaveProperty('action', 'checked_out');
    expect(entry).toHaveProperty('timestamp');
  });

  test('respects custom page and limit query parameters', async () => {
    // Create multiple history entries: checkout, return, checkout, return
    await request(app).post(`/books/${seededBook.id}/checkout`);
    await request(app).post(`/books/${seededBook.id}/return`);
    await request(app).post(`/books/${seededBook.id}/checkout`);
    await request(app).post(`/books/${seededBook.id}/return`);

    const res = await request(app).get(`/books/${seededBook.id}/history?page=2&limit=2`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toEqual({ page: 2, limit: 2, total: 4 });
  });

  test('returns correct pagination with custom limit', async () => {
    await request(app).post(`/books/${seededBook.id}/checkout`);
    await request(app).post(`/books/${seededBook.id}/return`);

    const res = await request(app).get(`/books/${seededBook.id}/history?limit=1`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toEqual({ page: 1, limit: 1, total: 2 });
  });

  test('response shape matches expected format', async () => {
    const res = await request(app).get(`/books/${seededBook.id}/history`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination).toHaveProperty('page');
    expect(res.body.pagination).toHaveProperty('limit');
    expect(res.body.pagination).toHaveProperty('total');
  });
});
