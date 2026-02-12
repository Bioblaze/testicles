# Tier 4: View Book Endpoint

---

## Objective

Implement the `GET /books/:id` endpoint that returns a single book by its UUID, validate the path parameter format, handle the not-found case gracefully with a proper JSON response, and add integration tests covering all response branches.

---

## Dependencies

No new dependencies. This tier uses packages already installed:
- `express` (routing)
- `express-validator` (path parameter validation)
- `supertest` and `jest` (testing)

---

## Project Structure (additions)

```
test/
└── routes/
    └── books.view.test.js      # Integration tests for GET /books/:id
```

No new source files are created — all implementation is added to `src/routes/books.js`.

---

## Endpoint Specification

### `GET /books/:id` — Retrieve a Single Book

| Aspect | Detail |
|---|---|
| **HTTP Method** | `GET` |
| **Path** | `/books/:id` |
| **Path Parameter** | `id` — must be a valid UUID v4 |
| **Success Response** | `200 OK` — returns the full book object |
| **Invalid ID Format** | `400 Bad Request` — returns `{ errors: [{ field: "id", message: "..." }] }` |
| **Book Not Found** | `404 Not Found` — returns `{ error: "Book not found" }` |

#### Response Body (200)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "isbn": "978-0-7432-7356-5",
  "published_year": 1925,
  "status": "available",
  "checked_out_at": null,
  "created_at": "2025-01-15T12:00:00.000Z",
  "updated_at": "2025-01-15T12:00:00.000Z"
}
```

---

## Implementation Details

### `src/routes/books.js` — Modifications

Add a new route definition for `GET /:id` on the existing books router.

#### Middleware Chain

1. **`param('id').isUUID(4).withMessage('ID must be a valid UUID v4')`** — Validates the `:id` path parameter is a properly formatted UUID v4. Rejects malformed IDs before they ever reach the database.
2. **`validate`** — The shared validation error handler middleware (from `src/middleware/validate.js`). Returns `400` with structured errors if validation fails.
3. **Handler function** — The route handler.

#### Handler Logic

```
1. Read `id` from `req.params.id`.
2. Call `book.findById(db, id)` where `db = req.app.locals.db`.
3. If the result is `null`:
   - Respond with `404` and `{ error: "Book not found" }`.
4. Otherwise:
   - Respond with `200` and the full book object.
```

**Important considerations**:
- The route must be defined **after** `GET /` (list) to avoid Express matching `:id` as a literal path segment for other routes.
- UUID validation at the middleware level prevents unnecessary database lookups for obviously invalid IDs (e.g., `GET /books/not-a-uuid`).

---

## Tests

### `test/routes/books.view.test.js` — GET /books/:id Integration Tests

Test setup:
- Import `supertest` and the `app`.
- Create a helper to seed a book into the database and capture its `id`.
- Use a known non-existent but valid UUID for 404 tests (e.g., `'00000000-0000-4000-8000-000000000000'`).

| # | Test Case | Request | Expected Status | Expected Body |
|---|---|---|---|---|
| 1 | Returns the correct book for a valid existing ID | Seed a book, `GET /books/:seededId` | `200` | Body matches the seeded book's data |
| 2 | Returns 404 for a valid UUID that does not exist | `GET /books/00000000-0000-4000-8000-000000000000` | `404` | `{ error: "Book not found" }` |
| 3 | Returns 400 for a malformed (non-UUID) ID | `GET /books/not-a-uuid` | `400` | `{ errors: [{ field: "id", message: "..." }] }` |
| 4 | Returns 400 for a numeric ID | `GET /books/12345` | `400` | `{ errors: [{ field: "id", message: "..." }] }` |
| 5 | Response body contains all book schema fields | Seed a book, `GET /books/:id` | `200` | Body has `id`, `title`, `author`, `isbn`, `published_year`, `status`, `checked_out_at`, `created_at`, `updated_at` |
| 6 | `status` field reflects `"available"` for a new book | Seed a book (default status), `GET /books/:id` | `200` | `body.status === "available"` |
| 7 | `checked_out_at` is `null` for an available book | Seed a book, `GET /books/:id` | `200` | `body.checked_out_at === null` |

**Test structure example**:

```javascript
const request = require('supertest');
const app = require('../../src/app');

describe('GET /books/:id', () => {
  let seededBook;

  beforeEach(async () => {
    // Seed a book via POST /books or directly via the model
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

  it('returns 200 with the correct book', async () => {
    const res = await request(app).get(`/books/${seededBook.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(seededBook.id);
    expect(res.body.title).toBe('Test Book');
  });

  it('returns 404 for a non-existent UUID', async () => {
    const res = await request(app).get('/books/00000000-0000-4000-8000-000000000000');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Book not found' });
  });

  it('returns 400 for a malformed ID', async () => {
    const res = await request(app).get('/books/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'id' }),
      ])
    );
  });
});
```

---

## Acceptance Criteria

- [ ] `GET /books/:id` returns `200` with the full book object for a valid, existing ID.
- [ ] `GET /books/:id` returns `404` with `{ error: "Book not found" }` for a valid UUID that does not exist in the database.
- [ ] `GET /books/:id` returns `400` with a structured validation error for a malformed (non-UUID) ID.
- [ ] The response body includes every field defined in the book schema.
- [ ] The `status` field accurately reflects the current state of the book.
- [ ] No unhandled exceptions are thrown for any input — all paths return structured JSON.
- [ ] All 7 integration tests pass.
- [ ] All prior tier tests continue to pass.
- [ ] CI pipeline remains green.
