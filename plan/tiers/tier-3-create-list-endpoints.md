# Tier 3: Create Book & List Books Endpoints

---

## Objective

Expose the first two RESTful endpoints — `POST /books` (create) and `GET /books` (list) — wire them through the Express router to the Book model, add declarative request validation middleware, and cover both endpoints with thorough integration tests.

---

## Dependencies

| Package | Version Strategy | Purpose |
|---|---|---|
| `express-validator` | latest | Declarative request validation and sanitization chains for Express |

Install command:

```bash
npm install express-validator
```

---

## Project Structure (additions)

```
src/
├── routes/
│   └── books.js                # Book route definitions (POST /books, GET /books)
└── middleware/
    └── validate.js             # Generic validation error handler middleware
test/
└── routes/
    ├── books.create.test.js    # Integration tests for POST /books
    └── books.list.test.js      # Integration tests for GET /books
```

---

## Endpoint Specifications

### `POST /books` — Create a New Book

| Aspect | Detail |
|---|---|
| **HTTP Method** | `POST` |
| **Path** | `/books` |
| **Request Body** | JSON: `{ title, author, isbn, published_year }` — all required |
| **Content-Type** | `application/json` |
| **Success Response** | `201 Created` — returns the full created book object |
| **Validation Failure** | `400 Bad Request` — returns `{ errors: [{ field, message }] }` |
| **Duplicate ISBN** | `409 Conflict` — returns `{ error: "A book with this ISBN already exists" }` |

#### Validation Rules

| Field | Rules |
|---|---|
| `title` | Required, must be a non-empty string, max 255 characters. Trimmed. |
| `author` | Required, must be a non-empty string, max 255 characters. Trimmed. |
| `isbn` | Required, must be a valid ISBN-10 or ISBN-13 format (use `isISBN()` from `express-validator`). |
| `published_year` | Required, must be an integer between 1000 and the current year (inclusive). |

### `GET /books` — List All Books (Paginated)

| Aspect | Detail |
|---|---|
| **HTTP Method** | `GET` |
| **Path** | `/books` |
| **Query Parameters** | `page` (default `1`), `limit` (default `20`, max `100`) |
| **Success Response** | `200 OK` — returns `{ data: Book[], pagination: { page, limit, total } }` |

#### Query Parameter Handling

| Parameter | Default | Rules |
|---|---|---|
| `page` | `1` | Must be a positive integer. Invalid values silently fall back to `1`. |
| `limit` | `20` | Must be a positive integer, capped at `100`. Invalid values silently fall back to `20`. |

**Pagination formula**: `offset = (page - 1) * limit`

---

## File-by-File Implementation Details

### `src/middleware/validate.js` — Validation Error Handler

A higher-order middleware function that terminates the request if validation errors exist.

**Behavior**:
1. Call `validationResult(req)` from `express-validator`.
2. If the result is not empty:
   - Extract errors and normalize them into `{ field, message }` objects.
   - Respond with `400 Bad Request` and body `{ errors: [...] }`.
   - Do **not** call `next()` — the request is short-circuited.
3. If no errors, call `next()` to pass control to the route handler.

**Example**:

```javascript
const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
    }));
    return res.status(400).json({ errors: formatted });
  }
  next();
}

module.exports = validate;
```

### `src/routes/books.js` — Book Routes

Creates an Express `Router` and defines two routes.

#### Route: `POST /`

Middleware chain:
1. `body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 255 }).withMessage('Title must not exceed 255 characters')`
2. `body('author').trim().notEmpty().withMessage('Author is required').isLength({ max: 255 }).withMessage('Author must not exceed 255 characters')`
3. `body('isbn').notEmpty().withMessage('ISBN is required').isISBN().withMessage('ISBN must be a valid ISBN-10 or ISBN-13')`
4. `body('published_year').isInt({ min: 1000, max: new Date().getFullYear() }).withMessage('Published year must be an integer between 1000 and the current year')`
5. `validate` middleware
6. Handler function

**Handler logic**:
- Extract validated fields from `req.body`.
- Call `book.create(db, { title, author, isbn, published_year })`.
- On success, respond with `201` and the created book object.
- Catch duplicate ISBN errors and respond with `409 Conflict`.

#### Route: `GET /`

Middleware chain:
1. `query('page').optional().isInt({ min: 1 }).toInt()`
2. `query('limit').optional().isInt({ min: 1, max: 100 }).toInt()`
3. Handler function (no validate middleware — invalid values fall back to defaults)

**Handler logic**:
- Read `page` and `limit` from `req.query`, applying defaults if missing or invalid.
- Compute `offset = (page - 1) * limit`.
- Call `book.findAll(db, { limit, offset })`.
- Respond with `200` and `{ data: books, pagination: { page, limit, total } }`.

### `src/app.js` — Modifications

- Add `express.json()` middleware at the top of the middleware stack (if not already present from Tier 1).
- Import and mount `routes/books.js` at `/books`.
- The health route remains mounted at `/health`.
- The 404 catch-all remains at the bottom.

**Database injection**: The app needs access to the database instance. Two approaches:
1. **Module-level singleton**: `app.js` imports `getDatabase()` and `migrate()`, creates the DB, runs migrations, and attaches it to `app.locals.db`. Route handlers access it via `req.app.locals.db`.
2. This approach keeps routes decoupled from database initialization.

```javascript
const { getDatabase } = require('./db/connection');
const { migrate } = require('./db/migrate');

const db = getDatabase();
migrate(db);

app.locals.db = db;
```

Route handlers access the database as `req.app.locals.db`.

---

## Tests

### `test/routes/books.create.test.js` — POST /books Integration Tests

Test setup:
- Import `supertest` and the `app`.
- Use an in-memory database (the app factory should use `:memory:` when `NODE_ENV=test`).
- Define a `validBook` fixture for reuse.

| # | Test Case | Request | Expected Status | Expected Body |
|---|---|---|---|---|
| 1 | Valid payload creates a book | `POST /books` with all valid fields | `201` | Body contains all fields, `id` is a UUID, `status` is `"available"`, `created_at` and `updated_at` are present |
| 2 | Missing `title` returns validation error | `POST /books` without `title` | `400` | `{ errors: [{ field: "title", message: "..." }] }` |
| 3 | Missing `author` returns validation error | `POST /books` without `author` | `400` | `{ errors: [{ field: "author", message: "..." }] }` |
| 4 | Invalid ISBN format returns validation error | `POST /books` with `isbn: "not-an-isbn"` | `400` | Error references `isbn` field |
| 5 | `published_year` out of range returns error | `POST /books` with `published_year: 999` | `400` | Error references `published_year` field |
| 6 | `published_year` in the future returns error | `POST /books` with `published_year: 9999` | `400` | Error references `published_year` field |
| 7 | Empty body returns all field errors | `POST /books` with `{}` | `400` | `errors` array contains entries for `title`, `author`, `isbn`, `published_year` |
| 8 | Duplicate ISBN returns conflict | Create a book, then `POST /books` with the same ISBN | `409` | `{ error: "A book with this ISBN already exists" }` |
| 9 | Response includes expected default fields | `POST /books` with valid data | `201` | Response has `id`, `created_at`, `updated_at`, `status: "available"`, `checked_out_at: null` |

### `test/routes/books.list.test.js` — GET /books Integration Tests

Test setup:
- Seed the database with a known number of books (e.g., 25) via the model's `create` method or direct `POST` requests.

| # | Test Case | Request | Expected Status | Expected Body |
|---|---|---|---|---|
| 1 | Returns empty data array when no books exist | `GET /books` (no seeding) | `200` | `{ data: [], pagination: { page: 1, limit: 20, total: 0 } }` |
| 2 | Returns seeded books with correct count | `GET /books` (after seeding 25 books) | `200` | `data` has 20 items, `pagination.total` is 25 |
| 3 | Pagination defaults applied | `GET /books` (no query params) | `200` | `pagination.page` is 1, `pagination.limit` is 20 |
| 4 | Custom `page` and `limit` work | `GET /books?page=2&limit=10` (after seeding 25 books) | `200` | `data` has 10 items, `pagination.page` is 2 |
| 5 | `limit` is capped at 100 | `GET /books?limit=200` | `200` | `pagination.limit` is 100 (or default 20 if invalid) |
| 6 | Response includes `pagination` object | `GET /books` | `200` | Body has `data` (array) and `pagination` (object with `page`, `limit`, `total`) |
| 7 | Invalid `page` falls back to default | `GET /books?page=-1` | `200` | `pagination.page` is 1 |
| 8 | Invalid `limit` falls back to default | `GET /books?limit=abc` | `200` | `pagination.limit` is 20 |

---

## Acceptance Criteria

- [ ] `express-validator` is installed and listed in `package.json`.
- [ ] `POST /books` creates a book and returns `201` with the full object.
- [ ] `POST /books` returns `400` for any validation failure with structured error array.
- [ ] `POST /books` returns `409` for duplicate ISBN.
- [ ] `GET /books` returns paginated results with `data` and `pagination` fields.
- [ ] `GET /books` applies defaults for missing or invalid query parameters.
- [ ] `GET /books` caps `limit` at 100.
- [ ] Invalid requests never reach the model layer (validation middleware short-circuits).
- [ ] All 17 integration tests pass.
- [ ] All Tier 1 and Tier 2 tests continue to pass.
- [ ] CI pipeline remains green.
