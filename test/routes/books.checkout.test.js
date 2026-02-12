const request = require('supertest');
const app = require('../../src/app');

const NON_EXISTENT_UUID = '00000000-0000-4000-a000-000000000000';

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

  test('returns 200 with checked_out status on successful checkout', async () => {
    const res = await request(app).post(`/books/${seededBook.id}/checkout`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(seededBook.id);
    expect(res.body.status).toBe('checked_out');
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

  test('returns 400 with structured validation error for malformed UUID', async () => {
    const res = await request(app).post('/books/not-a-uuid/checkout');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(Array.isArray(res.body.errors)).toBe(true);
    const idError = res.body.errors.find(e => e.field === 'id');
    expect(idError).toBeDefined();
  });

  test('response status field equals checked_out after successful checkout', async () => {
    const res = await request(app).post(`/books/${seededBook.id}/checkout`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('checked_out');
  });

  test('response checked_out_at is a valid parseable timestamp after successful checkout', async () => {
    const res = await request(app).post(`/books/${seededBook.id}/checkout`);

    expect(res.status).toBe(200);
    expect(res.body.checked_out_at).not.toBeNull();
    const parsed = new Date(res.body.checked_out_at);
    expect(isNaN(parsed.getTime())).toBe(false);
  });
});
