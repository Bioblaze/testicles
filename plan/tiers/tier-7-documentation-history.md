# Tier 7: API Documentation & Developer Experience

---

## Objective

Generate an OpenAPI 3.0 specification from the implemented routes using JSDoc annotations, serve interactive documentation via Swagger UI, add a `GET /books/:id/history` endpoint for audit visibility into checkout/return events, and ensure the documentation itself is validated in CI — guaranteeing docs never drift from the implementation.

---

## Dependencies

| Package | Version Strategy | Purpose |
|---|---|---|
| `swagger-ui-express` | latest | Serves interactive Swagger UI as Express middleware |
| `swagger-jsdoc` | latest | Generates OpenAPI 3.0 spec from JSDoc `@openapi` annotations in source files |

Install command:

```bash
npm install swagger-ui-express swagger-jsdoc
```

---

## Project Structure (additions)

```
src/
├── db/
│   └── migrations/
│       └── 002_create_checkout_history.sql   # Checkout history table DDL
├── models/
│   └── checkoutHistory.js                    # Data-access for checkout/return event log
├── docs/
│   └── swagger.js                            # OpenAPI spec generation config and setup
└── routes/
    └── books.js                              # (modified) adds GET /:id/history route
test/
├── models/
│   └── checkoutHistory.test.js               # Unit tests for checkout history model
├── routes/
│   └── books.history.test.js                 # Integration tests for GET /books/:id/history
└── docs/
    └── swagger.test.js                       # OpenAPI spec validation tests
```

---

## Database Schema Addition

### `002_create_checkout_history.sql`

```sql
CREATE TABLE IF NOT EXISTS checkout_history (
  id        TEXT    PRIMARY KEY,
  book_id   TEXT    NOT NULL REFERENCES books(id),
  action    TEXT    NOT NULL,
  timestamp TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_checkout_history_book_id
  ON checkout_history(book_id);
```

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `TEXT` | Primary key | UUID v4, generated application-side |
| `book_id` | `TEXT` | `NOT NULL`, Foreign key → `books.id` | Links history entry to its book |
| `action` | `TEXT` | `NOT NULL` | Enum: `"checked_out"`, `"returned"` |
| `timestamp` | `TEXT` | `NOT NULL` | ISO-8601 timestamp of when the action occurred |

An index on `book_id` is created for efficient history queries by book.

---

## File-by-File Implementation Details

### `src/models/checkoutHistory.js` — Checkout History Data-Access Object

Exports an object with methods for reading checkout history records. Write operations are handled within the checkout service's transaction.

#### `create(db, { bookId, action })`

- Generates a UUID v4 for the `id` field.
- Sets `timestamp` to the current ISO-8601 string.
- Inserts a row into `checkout_history`.
- Returns the created history entry.

**Note**: This method is called from within `src/services/checkout.js` inside the same transaction as the book status update, ensuring atomicity.

#### `findByBookId(db, bookId, { limit, offset })`

- Defaults: `limit = 20`, `offset = 0`.
- Executes: `SELECT * FROM checkout_history WHERE book_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`.
- Executes a parallel count: `SELECT COUNT(*) AS total FROM checkout_history WHERE book_id = ?`.
- Returns `{ entries: HistoryEntry[], total: number }`.

**Ordering**: Results are returned in **reverse chronological order** (newest first) so the most recent events appear at the top.

### `src/services/checkout.js` — Modifications

Both `checkoutBook` and `returnBook` are modified to record history within their existing transactions.

#### `checkoutBook(db, id)` — Updated

```
After the UPDATE statement (inside the transaction):
  - Call checkoutHistory.create(db, { bookId: id, action: 'checked_out' })
```

#### `returnBook(db, id)` — Updated

```
After the UPDATE statement (inside the transaction):
  - Call checkoutHistory.create(db, { bookId: id, action: 'returned' })
```

Because the history insert runs **inside the same `db.transaction()`**, it either commits with the book status update or rolls back together — maintaining data consistency.

### `src/docs/swagger.js` — OpenAPI Spec Generation

Uses `swagger-jsdoc` to scan source files for `@openapi` annotations and produce a complete OpenAPI 3.0 specification object.

**Configuration**:

```javascript
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Book API',
      version: '1.0.0',
      description: 'A RESTful API for managing a book library with checkout/return functionality',
    },
    servers: [
      {
        url: '/api',
        description: 'API server',
      },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
```

**Mounting in `src/app.js`**:

```javascript
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');

// Mount Swagger UI at /docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Expose raw JSON spec at /docs/json (useful for tooling)
app.get('/docs/json', (req, res) => {
  res.json(swaggerSpec);
});
```

### JSDoc/OpenAPI Annotations on Route Handlers

Every route handler in `src/routes/books.js` and `src/routes/health.js` must be annotated with `@openapi` blocks. These annotations are the **single source of truth** for the API specification.

#### Required Annotations Per Route

Each route annotation must include:
- **Path** and **HTTP method**
- **Summary** and **description**
- **Parameters** (path params, query params) with type, format, and description
- **Request body** schema (for POST endpoints)
- **All response codes** with schema definitions
- **Tags** for grouping (e.g., `Books`, `Health`, `History`)

#### Example: `GET /health`

```javascript
/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     description: Returns the API health status
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
```

#### Example: `POST /books`

```javascript
/**
 * @openapi
 * /books:
 *   post:
 *     tags: [Books]
 *     summary: Create a new book
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, author, isbn, published_year]
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               author:
 *                 type: string
 *                 maxLength: 255
 *               isbn:
 *                 type: string
 *                 description: Valid ISBN-10 or ISBN-13
 *               published_year:
 *                 type: integer
 *                 minimum: 1000
 *     responses:
 *       201:
 *         description: Book created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Duplicate ISBN conflict
 */
```

#### Routes That Must Be Annotated

| Route | Method | Tag |
|---|---|---|
| `/health` | `GET` | Health |
| `/books` | `POST` | Books |
| `/books` | `GET` | Books |
| `/books/:id` | `GET` | Books |
| `/books/:id/checkout` | `POST` | Books |
| `/books/:id/return` | `POST` | Books |
| `/books/:id/history` | `GET` | History |

---

## Endpoint Specification

### `GET /books/:id/history` — Retrieve Checkout/Return History

| Aspect | Detail |
|---|---|
| **HTTP Method** | `GET` |
| **Path** | `/books/:id/history` |
| **Path Parameter** | `id` — must be a valid UUID v4 |
| **Query Parameters** | `page` (default `1`), `limit` (default `20`, max `100`) |
| **Success Response** | `200 OK` — `{ data: HistoryEntry[], pagination: { page, limit, total } }` |
| **Invalid ID** | `400 Bad Request` — `{ errors: [{ field: "id", message: "..." }] }` |
| **Book Not Found** | `404 Not Found` — `{ error: "Book not found" }` |

#### Response Body (200)

```json
{
  "data": [
    {
      "id": "a1b2c3d4-...",
      "book_id": "550e8400-...",
      "action": "returned",
      "timestamp": "2025-02-10T15:30:00.000Z"
    },
    {
      "id": "e5f6g7h8-...",
      "book_id": "550e8400-...",
      "action": "checked_out",
      "timestamp": "2025-02-01T09:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2
  }
}
```

### `src/routes/books.js` — Route Addition

Add `GET /:id/history` with:

1. `param('id').isUUID(4).withMessage('ID must be a valid UUID v4')`
2. `query('page').optional().isInt({ min: 1 }).toInt()`
3. `query('limit').optional().isInt({ min: 1, max: 100 }).toInt()`
4. `validate` middleware
5. Handler function

**Handler logic**:
```
1. Read `id` from `req.params.id`.
2. Verify the book exists by calling `book.findById(db, id)`.
3. If book is null → respond `404`.
4. Read `page` and `limit` from `req.query`, apply defaults.
5. Compute `offset = (page - 1) * limit`.
6. Call `checkoutHistory.findByBookId(db, id, { limit, offset })`.
7. Respond with `200` and `{ data, pagination: { page, limit, total } }`.
```

---

## Tests

### `test/models/checkoutHistory.test.js` — Checkout History Model Unit Tests

Test setup: fresh in-memory DB per test, migrations run, book seeded.

| # | Test Case | Setup | Action | Assertion |
|---|---|---|---|---|
| 1 | History entry is created on checkout | Seed book | `checkoutBook(db, id)` | `checkout_history` table has 1 row with `action: "checked_out"` |
| 2 | History entry is created on return | Seed book, checkout | `returnBook(db, id)` | `checkout_history` table has 2 rows; latest has `action: "returned"` |
| 3 | `findByBookId` returns entries in reverse chronological order | Seed book, checkout, return | `findByBookId(db, bookId, {})` | First entry is `"returned"`, second is `"checked_out"` |
| 4 | `findByBookId` respects pagination | Seed book, checkout/return 5 times (10 events) | `findByBookId(db, bookId, { limit: 3, offset: 0 })` | Returns exactly 3 entries, `total` is 10 |
| 5 | `findByBookId` returns empty array for book with no history | Seed book (never checked out) | `findByBookId(db, bookId, {})` | Returns `{ entries: [], total: 0 }` |

### `test/routes/books.history.test.js` — GET /books/:id/history Integration Tests

| # | Test Case | Request | Expected Status | Expected Body |
|---|---|---|---|---|
| 1 | Returns checkout/return events for a book | Seed, checkout, return, `GET /books/:id/history` | `200` | `data` array with 2 entries |
| 2 | Returns 404 for non-existent book | `GET /books/:nonexistentUuid/history` | `404` | `{ error: "Book not found" }` |
| 3 | Returns 400 for malformed UUID | `GET /books/not-a-uuid/history` | `400` | Validation error for `id` |
| 4 | Pagination query params work | Seed, checkout/return multiple times, `GET /books/:id/history?page=1&limit=2` | `200` | `data` has 2 entries, `pagination.total` reflects total events |
| 5 | History reflects full checkout → return cycle | Seed, checkout, return | `200` | First entry is `"returned"`, second is `"checked_out"` |
| 6 | Empty history for book never checked out | Seed book, `GET /books/:id/history` | `200` | `{ data: [], pagination: { page: 1, limit: 20, total: 0 } }` |

### `test/docs/swagger.test.js` — OpenAPI Spec Validation Tests

| # | Test Case | Action | Assertion |
|---|---|---|---|
| 1 | Generated spec is valid OpenAPI 3.0 | Load `swaggerSpec`, validate against OpenAPI 3.0 JSON schema (use a library like `@apidevtools/swagger-parser`) | Validation passes without errors |
| 2 | Every defined route has a path in the spec | Compare registered Express routes against `swaggerSpec.paths` | All routes are present |
| 3 | All response codes are documented | For each path, check that all response codes used by handlers appear in the spec | No undocumented response codes |
| 4 | Spec contains required info fields | Check `swaggerSpec.info` | Has `title`, `version`, `description` |
| 5 | All paths have at least one tag | Iterate paths and methods | Every operation has a `tags` array with at least one entry |

**Dev dependency for spec validation**:

```bash
npm install --save-dev @apidevtools/swagger-parser
```

---

## CI Additions

The existing `.github/workflows/ci.yml` already runs `npm test`, which will execute `swagger.test.js` along with all other tests. The spec validation tests ensure:

- If a route is added but not annotated, the "every route has a path" test fails.
- If an annotation has syntax errors, the OpenAPI validation test fails.
- The spec validation failing **blocks the build**, ensuring documentation never drifts from the implementation.

No additional CI steps are required — the existing `npm test` command covers everything.

---

## `src/app.js` — Final Middleware Stack

After this tier, the complete middleware/route order in `src/app.js` is:

```
1. helmet()
2. pino-http(logger)
3. express.json()
4. rateLimiter
5. Swagger UI at /docs
6. Swagger JSON at /docs/json
7. Health route at /health
8. Book routes at /books (includes /:id, /:id/checkout, /:id/return, /:id/history)
9. 404 catch-all
10. errorHandler
```

---

## Acceptance Criteria

- [ ] `swagger-ui-express` and `swagger-jsdoc` are installed and listed in `package.json`.
- [ ] `@apidevtools/swagger-parser` is installed as a dev dependency.
- [ ] `002_create_checkout_history.sql` creates the `checkout_history` table with correct schema and index.
- [ ] `src/models/checkoutHistory.js` exposes `create` and `findByBookId` methods.
- [ ] `src/services/checkout.js` records history entries atomically within checkout/return transactions.
- [ ] `GET /books/:id/history` returns paginated history in reverse chronological order.
- [ ] `GET /books/:id/history` returns `404` for non-existent books and `400` for malformed UUIDs.
- [ ] Swagger UI is accessible at `/docs` and renders all endpoints.
- [ ] Raw OpenAPI JSON is available at `/docs/json`.
- [ ] Every route handler has `@openapi` JSDoc annotations.
- [ ] All 5 checkout history model tests pass.
- [ ] All 6 history route integration tests pass.
- [ ] All 5 Swagger spec validation tests pass.
- [ ] All prior tier tests continue to pass.
- [ ] CI pipeline remains green (spec validation included).
- [ ] Checkout history provides a complete, ordered audit trail for every state change.
