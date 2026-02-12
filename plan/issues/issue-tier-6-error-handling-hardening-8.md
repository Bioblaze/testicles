TITLE:
Create edge case and hardening integration tests in test/integration/edgeCases.test.js

BODY:
## Context

This task is part of **Tier 6: Error Handling, Logging & API Hardening**, which adds centralized error handling, structured logging, input sanitization, rate limiting, and security headers to make the API production-ready and resilient against malformed input, abuse, and unexpected failures.

With all hardening middleware integrated into the app (#167), this task creates 10 integration tests in `test/integration/edgeCases.test.js` using `supertest` to verify the API handles edge cases correctly. These tests cover malformed JSON, extremely long input, SQL injection attempts (both query params and body fields), unexpected content types, concurrent resource contention, negative pagination, unknown fields, and empty request bodies. Together they ensure the API never crashes with a 500 on bad input, never leaks internal details, and remains resilient under adversarial conditions.

## Acceptance Criteria

- [ ] `test/integration/edgeCases.test.js` is created with 10 passing integration tests.
- [ ] Test 1: **Malformed JSON body returns 400** — `POST /books` with raw string `'{ invalid json }'` and `Content-Type: application/json` returns `400` with `{ error: "Malformed JSON in request body" }`, NOT `500`.
- [ ] Test 2: **Extremely long string fields are rejected** — `POST /books` with a `title` of 10,000 characters returns `400` with a validation error.
- [ ] Test 3: **SQL injection in query params is neutralized** — `GET /books?page=1;DROP TABLE books` returns `200` or `400`; the `books` table is NOT dropped (verified by a subsequent successful query).
- [ ] Test 4: **SQL injection in body fields is neutralized** — `POST /books` with `title: "'; DROP TABLE books; --"` returns `201` or `400`; if the record is created, the literal string is stored safely (parameterized queries prevent injection). The `books` table is NOT dropped.
- [ ] Test 5: **Unexpected Content-Type returns 400 or 415** — `POST /books` with `Content-Type: text/plain` returns `400` or `415`; the body is not parsed as JSON.
- [ ] Test 6: **Concurrent checkout of same book** — two simultaneous `POST /books/:id/checkout` requests result in exactly one `200` and one `409` (transaction isolation prevents double-checkout).
- [ ] Test 7: **Negative page number falls back to default** — `GET /books?page=-1` returns `200` and the response reflects default page 1 behavior.
- [ ] Test 8: **Extra unknown fields are ignored** — `POST /books` with `{ ...validFields, foo: "bar" }` returns `201` and the created book does NOT contain the `foo` field.
- [ ] Test 9: **Empty request body returns 400** — `POST /books` with no body at all returns `400` with validation errors for required fields.
- [ ] Test 10: **Content-Length: 0 with empty body returns 400** — `POST /books` with `Content-Length: 0` and an empty body returns `400` with validation errors, not `500`.
- [ ] Tests use `supertest` for HTTP-level integration testing.
- [ ] All 10 tests pass when running `npm test`.
- [ ] All prior tier tests continue to pass.
- [ ] No unhandled promise rejections or uncaught exceptions in any tested code path.

## Implementation Notes

### Test file structure

The test file should import `supertest` and the app instance, and organize tests under a single `describe('Edge Cases & Hardening')` block. Each test should be independent and set up any required data (e.g., creating a book before testing checkout concurrency).

```javascript
const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/db');

describe('Edge Cases & Hardening', () => {
  // Setup/teardown as needed (e.g., seed DB, clean up after)

  afterAll(async () => {
    await db.close();
  });

  // ... tests
});
```

### Test cases

| # | Test Case | Request | Expected Status | Expected Behavior |
|---|-----------|---------|-----------------|-------------------|
| 1 | Malformed JSON body returns 400 | `POST /books` with body `"{ invalid json }"` (`Content-Type: application/json`) | `400` | `{ error: "Malformed JSON in request body" }` — NOT `500` |
| 2 | Extremely long string fields are rejected | `POST /books` with `title` of 10,000 characters | `400` | Validation error for title length |
| 3 | SQL injection in query params is neutralized | `GET /books?page=1;DROP TABLE books` | `200` or `400` | Table is NOT dropped; response is normal or validation error |
| 4 | SQL injection in body fields is neutralized | `POST /books` with `title: "'; DROP TABLE books; --"` | `201` or `400` | If stored, the literal string is stored safely |
| 5 | Unexpected Content-Type returns 400/415 | `POST /books` with `Content-Type: text/plain` | `400` or `415` | Request is rejected, body is not parsed |
| 6 | Concurrent checkout of same book | Two simultaneous `POST /books/:id/checkout` | One `200`, one `409` | Transaction isolation prevents double-checkout |
| 7 | Negative page number defaults to page 1 | `GET /books?page=-1` | `200` | Falls back to default `page: 1` |
| 8 | Extra unknown fields are ignored | `POST /books` with `{ ...validFields, foo: "bar" }` | `201` | Created book does NOT contain `foo` |
| 9 | Empty request body to POST | `POST /books` with no body | `400` | Validation errors for required fields |
| 10 | Content-Length: 0 with empty body | `POST /books` with empty body | `400` | Validation errors, not a 500 |

### Test 1 — malformed JSON body

Send a raw invalid JSON string with the `application/json` content type and verify the centralized error handler catches the `entity.parse.failed` error from `express.json()`:

```javascript
it('should return 400 for malformed JSON body, not 500', async () => {
  const res = await request(app)
    .post('/books')
    .set('Content-Type', 'application/json')
    .send('{ invalid json }');
  expect(res.status).toBe(400);
  expect(res.body).toEqual({ error: 'Malformed JSON in request body' });
});
```

### Test 2 — extremely long string field

Generate a 10,000-character string and verify the validation layer rejects it:

```javascript
it('should return 400 for extremely long title', async () => {
  const longTitle = 'a'.repeat(10000);
  const res = await request(app)
    .post('/books')
    .send({ title: longTitle, author: 'Test Author', isbn: '978-0-000000-00-0' });
  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty('error');
});
```

### Test 3 — SQL injection in query params

Attempt SQL injection via query parameters and verify the table still exists by making a follow-up query:

```javascript
it('should neutralize SQL injection in query params', async () => {
  const res = await request(app).get('/books?page=1;DROP TABLE books');
  expect([200, 400]).toContain(res.status);
  // Verify table still exists
  const check = await request(app).get('/books');
  expect(check.status).toBe(200);
});
```

### Test 4 — SQL injection in body fields

Attempt SQL injection via body fields and verify parameterized queries prevent execution:

```javascript
it('should neutralize SQL injection in body fields', async () => {
  const res = await request(app)
    .post('/books')
    .send({ title: "'; DROP TABLE books; --", author: 'Test', isbn: '978-0-000000-00-0' });
  expect([201, 400]).toContain(res.status);
  // Verify table still exists
  const check = await request(app).get('/books');
  expect(check.status).toBe(200);
});
```

### Test 5 — unexpected Content-Type

Send a request with `text/plain` content type and verify it is rejected:

```javascript
it('should return 400 or 415 for unexpected Content-Type', async () => {
  const res = await request(app)
    .post('/books')
    .set('Content-Type', 'text/plain')
    .send('some plain text');
  expect([400, 415]).toContain(res.status);
});
```

### Test 6 — concurrent checkout

Create a book, then fire two simultaneous checkout requests and verify exactly one succeeds and one fails with a conflict:

```javascript
it('should handle concurrent checkout with one 200 and one 409', async () => {
  // First, create and seed a book that is available for checkout
  const book = await request(app)
    .post('/books')
    .send({ title: 'Concurrent Test', author: 'Author', isbn: '978-0-000000-99-0' });
  const bookId = book.body.id;

  const [res1, res2] = await Promise.all([
    request(app).post(`/books/${bookId}/checkout`),
    request(app).post(`/books/${bookId}/checkout`),
  ]);

  const statuses = [res1.status, res2.status].sort();
  expect(statuses).toEqual([200, 409]);
});
```

### Test 7 — negative page number

```javascript
it('should fall back to page 1 for negative page number', async () => {
  const res = await request(app).get('/books?page=-1');
  expect(res.status).toBe(200);
});
```

### Test 8 — extra unknown fields

```javascript
it('should ignore extra unknown fields on POST /books', async () => {
  const res = await request(app)
    .post('/books')
    .send({ title: 'Valid Book', author: 'Author', isbn: '978-0-000000-88-0', foo: 'bar' });
  expect(res.status).toBe(201);
  expect(res.body).not.toHaveProperty('foo');
});
```

### Test 9 — empty request body

```javascript
it('should return 400 for empty request body', async () => {
  const res = await request(app)
    .post('/books')
    .send();
  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty('error');
});
```

### Test 10 — Content-Length: 0

```javascript
it('should return 400 for Content-Length: 0, not 500', async () => {
  const res = await request(app)
    .post('/books')
    .set('Content-Length', '0')
    .send('');
  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty('error');
});
```

### Key considerations

- Each test must be **independent** — create any required data (books) within the test itself rather than relying on shared state.
- For test 6 (concurrent checkout), use `Promise.all` to fire both requests simultaneously and sort the resulting status codes for a deterministic assertion.
- For SQL injection tests (3 and 4), always follow up with a `GET /books` to confirm the table was not dropped.
- The centralized error handler (`src/middleware/errorHandler.js`) is responsible for catching the `entity.parse.failed` error from `express.json()` — test 1 validates this integration end-to-end.
- Logger is set to `silent` in test environment (`NODE_ENV=test`), so `pino-http` middleware output will not pollute test results.
- ISBNs used in tests should be unique to avoid collisions with seeded data or other tests.

## Dependencies

- #167 — All new middleware integrated into `src/app.js` in the correct order (error handler, helmet, rate limiter, pino-http must all be wired into the app before edge-case integration tests can validate end-to-end behavior).

## References

- Tasks file: `plan\tasks\tasks-tier-6-error-handling-hardening.json`
- Tier document: `plan\tiers\tier-6-error-handling-hardening.md`
