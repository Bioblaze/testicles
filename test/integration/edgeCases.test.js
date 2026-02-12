const request = require('supertest');
const app = require('../../src/app');

describe('Edge Cases & Hardening', () => {
  afterAll(() => {
    app.locals.db.close();
  });

  // Test 1: Malformed JSON body returns 400
  it('should return 400 for malformed JSON body, not 500', async () => {
    const res = await request(app)
      .post('/books')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Malformed JSON in request body' });
  });

  // Test 2: Extremely long string fields are rejected
  it('should return 400 for extremely long title', async () => {
    const longTitle = 'a'.repeat(10000);
    const res = await request(app)
      .post('/books')
      .send({ title: longTitle, author: 'Test Author', isbn: '9780743273565', published_year: 2020 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  // Test 3: SQL injection in query params is neutralized
  it('should neutralize SQL injection in query params', async () => {
    const res = await request(app).get('/books?page=1;DROP TABLE books');
    expect([200, 400]).toContain(res.status);
    // Verify table still exists
    const check = await request(app).get('/books');
    expect(check.status).toBe(200);
  });

  // Test 4: SQL injection in body fields is neutralized
  it('should neutralize SQL injection in body fields', async () => {
    const res = await request(app)
      .post('/books')
      .send({ title: "'; DROP TABLE books; --", author: 'Test', isbn: '9780140449136', published_year: 2020 });
    expect([201, 400]).toContain(res.status);
    // Verify table still exists
    const check = await request(app).get('/books');
    expect(check.status).toBe(200);
  });

  // Test 5: Unexpected Content-Type returns 400 or 415
  it('should return 400 or 415 for unexpected Content-Type', async () => {
    const res = await request(app)
      .post('/books')
      .set('Content-Type', 'text/plain')
      .send('some plain text');
    expect([400, 415]).toContain(res.status);
  });

  // Test 6: Concurrent checkout of same book
  it('should handle concurrent checkout with one 200 and one 409', async () => {
    // Create a book available for checkout
    const book = await request(app)
      .post('/books')
      .send({ title: 'Concurrent Test', author: 'Author', isbn: '9780061120084', published_year: 2020 });
    const bookId = book.body.id;

    const [res1, res2] = await Promise.all([
      request(app).post(`/books/${bookId}/checkout`),
      request(app).post(`/books/${bookId}/checkout`),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 409]);
  });

  // Test 7: Negative page number falls back to default
  it('should fall back to page 1 for negative page number', async () => {
    const res = await request(app).get('/books?page=-1');
    expect(res.status).toBe(200);
  });

  // Test 8: Extra unknown fields are ignored
  it('should ignore extra unknown fields on POST /books', async () => {
    const res = await request(app)
      .post('/books')
      .send({ title: 'Valid Book', author: 'Author', isbn: '9780451524935', published_year: 2020, foo: 'bar' });
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('foo');
  });

  // Test 9: Empty request body returns 400
  it('should return 400 for empty request body', async () => {
    const res = await request(app)
      .post('/books')
      .set('Content-Type', 'application/json')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  // Test 10: Content-Length: 0 with empty body returns 400
  it('should return 400 for Content-Length: 0, not 500', async () => {
    const res = await request(app)
      .post('/books')
      .set('Content-Type', 'application/json')
      .set('Content-Length', '0')
      .send('');
    expect(res.status).toBe(400);
    expect(res.body.error || res.body.errors).toBeTruthy();
  });
});
