const request = require('supertest');
const app = require('../../src/app');

const NON_EXISTENT_UUID = '00000000-0000-4000-8000-000000000000';

describe('POST /books/:id/checkout', () => {
  let seededBook;

  beforeEach(async () => {
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
    const res = await request(app).post('/books/not-a-uuid/checkout');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors).toEqual([
      { field: 'id', message: 'ID must be a valid UUID v4' },
    ]);
  });

  test('returns 400 with structured validation error for numeric ID "12345"', async () => {
    const res = await request(app).post('/books/12345/checkout');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors).toEqual([
      { field: 'id', message: 'ID must be a valid UUID v4' },
    ]);
  });

  test('returns 200 with updated book on successful checkout', async () => {
    const res = await request(app).post(`/books/${seededBook.id}/checkout`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(seededBook.id);
    expect(res.body.status).toBe('checked_out');
    expect(res.body.checked_out_at).not.toBeNull();
  });

  test('returns 404 with error message for non-existent book UUID', async () => {
    const res = await request(app).post(`/books/${NON_EXISTENT_UUID}/checkout`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Book not found' });
  });

  test('returns 409 with error message when book is already checked out', async () => {
    // First checkout succeeds
    await request(app).post(`/books/${seededBook.id}/checkout`);

    // Second checkout should fail with 409
    const res = await request(app).post(`/books/${seededBook.id}/checkout`);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Book is already checked out' });
  });

  test('response body contains all book schema fields on success', async () => {
    const res = await request(app).post(`/books/${seededBook.id}/checkout`);

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
