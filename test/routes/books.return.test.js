const request = require('supertest');
const app = require('../../src/app');

const NON_EXISTENT_UUID = '00000000-0000-4000-8000-000000000000';

describe('POST /books/:id/return', () => {
  let seededBook;

  beforeEach(async () => {
    app.locals.db.exec('DELETE FROM books');

    const createRes = await request(app)
      .post('/books')
      .send({
        title: 'Test Book',
        author: 'Test Author',
        isbn: '978-3-16-148410-0',
        published_year: 2023,
      });
    seededBook = createRes.body;

    // Check out the book so it can be returned
    await request(app).post(`/books/${seededBook.id}/checkout`);
  });

  test('returns 400 with structured validation error for non-UUID string "not-a-uuid"', async () => {
    const res = await request(app).post('/books/not-a-uuid/return');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors).toEqual([
      { field: 'id', message: 'ID must be a valid UUID v4' },
    ]);
  });

  test('returns 400 with structured validation error for numeric ID "12345"', async () => {
    const res = await request(app).post('/books/12345/return');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors).toEqual([
      { field: 'id', message: 'ID must be a valid UUID v4' },
    ]);
  });

  test('returns 200 with updated book on successful return', async () => {
    const res = await request(app).post(`/books/${seededBook.id}/return`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(seededBook.id);
    expect(res.body.status).toBe('available');
    expect(res.body.checked_out_at).toBeNull();
  });

  test('returns 404 with error message for non-existent book UUID', async () => {
    const res = await request(app).post(`/books/${NON_EXISTENT_UUID}/return`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Book not found' });
  });

  test('returns 409 with error message when book is not currently checked out', async () => {
    // Return the book first
    await request(app).post(`/books/${seededBook.id}/return`);

    // Second return should fail with 409
    const res = await request(app).post(`/books/${seededBook.id}/return`);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Book is not currently checked out' });
  });

  test('response body contains all book schema fields on success', async () => {
    const res = await request(app).post(`/books/${seededBook.id}/return`);

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
});
