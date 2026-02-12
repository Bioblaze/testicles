# Tier 5: Checkout & Return System

---

## Objective

Implement the book checkout and return lifecycle — `POST /books/:id/checkout` and `POST /books/:id/return`. Enforce business rules around availability state transitions with atomic database transactions, introduce custom error classes for typed error handling, record timestamps, and thoroughly test both happy paths and all error branches at the service and route levels.

---

## Dependencies

No new dependencies. This tier uses packages already installed:
- `express`, `express-validator` (routing, validation)
- `better-sqlite3` (transactions)
- `uuid` (ID generation)
- `jest`, `supertest` (testing)

---

## Project Structure (additions)

```
src/
├── errors.js                       # Custom error class hierarchy
└── services/
    └── checkout.js                 # Business logic for checkout/return operations
test/
├── services/
│   └── checkout.test.js            # Unit tests for checkout business logic
└── routes/
    ├── books.checkout.test.js      # Integration tests for POST /books/:id/checkout
    └── books.return.test.js        # Integration tests for POST /books/:id/return
```

---

## Endpoint Specifications

### `POST /books/:id/checkout` — Check Out a Book

| Aspect | Detail |
|---|---|
| **HTTP Method** | `POST` |
| **Path** | `/books/:id/checkout` |
| **Path Parameter** | `id` — must be a valid UUID v4 |
| **Precondition** | Book must exist and have `status: "available"` |
| **Side Effects** | Sets `status` → `"checked_out"`, sets `checked_out_at` → current ISO-8601 timestamp, bumps `updated_at` |
| **Success Response** | `200 OK` — returns the updated book object |
| **Invalid ID** | `400 Bad Request` — `{ errors: [{ field: "id", message: "..." }] }` |
| **Not Found** | `404 Not Found` — `{ error: "Book not found" }` |
| **Already Checked Out** | `409 Conflict` — `{ error: "Book is already checked out" }` |

### `POST /books/:id/return` — Return a Book

| Aspect | Detail |
|---|---|
| **HTTP Method** | `POST` |
| **Path** | `/books/:id/return` |
| **Path Parameter** | `id` — must be a valid UUID v4 |
| **Precondition** | Book must exist and have `status: "checked_out"` |
| **Side Effects** | Sets `status` → `"available"`, clears `checked_out_at` → `null`, bumps `updated_at` |
| **Success Response** | `200 OK` — returns the updated book object |
| **Invalid ID** | `400 Bad Request` — `{ errors: [{ field: "id", message: "..." }] }` |
| **Not Found** | `404 Not Found` — `{ error: "Book not found" }` |
| **Not Checked Out** | `409 Conflict` — `{ error: "Book is not currently checked out" }` |

### State Machine

```
  available ──── checkout ────→ checked_out
      ↑                              │
      └──────── return ──────────────┘
```

Only valid transitions:
- `available` → `checked_out` (via checkout)
- `checked_out` → `available` (via return)

All other transitions are rejected with `409 Conflict`.

---

## File-by-File Implementation Details

### `src/errors.js` — Custom Error Classes

Define a hierarchy of application-specific error classes. Each carries a `statusCode` property for HTTP response mapping.

```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

class BookNotFoundError extends AppError {
  constructor(message = 'Book not found') {
    super(message, 404);
  }
}

class BookUnavailableError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

module.exports = { AppError, BookNotFoundError, BookUnavailableError };
```

**Design rationale**:
- `AppError` is the base class. It stores `statusCode` so HTTP mapping is trivial.
- `BookNotFoundError` defaults to `404`. Used when a book ID doesn't exist.
- `BookUnavailableError` maps to `409`. Used when a state transition is invalid (e.g., checking out an already checked-out book).
- These classes are used by the service layer and caught by route handlers (or the centralized error handler in a later tier).

### `src/services/checkout.js` — Checkout/Return Business Logic

Pure business logic module, **decoupled from HTTP concerns**. Exports two functions.

#### `checkoutBook(db, id)`

```
1. Begin a better-sqlite3 transaction.
2. SELECT the book by `id`.
3. If no book found → throw BookNotFoundError.
4. If book.status !== "available" → throw BookUnavailableError("Book is already checked out").
5. UPDATE the book:
   - status = "checked_out"
   - checked_out_at = new Date().toISOString()
   - updated_at = new Date().toISOString()
6. SELECT and return the updated book.
7. Commit transaction.
```

#### `returnBook(db, id)`

```
1. Begin a better-sqlite3 transaction.
2. SELECT the book by `id`.
3. If no book found → throw BookNotFoundError.
4. If book.status !== "checked_out" → throw BookUnavailableError("Book is not currently checked out").
5. UPDATE the book:
   - status = "available"
   - checked_out_at = null
   - updated_at = new Date().toISOString()
6. SELECT and return the updated book.
7. Commit transaction.
```

**Transaction usage**: Both functions wrap their read-then-write in a `better-sqlite3` transaction (`db.transaction(...)`) to prevent race conditions. If two concurrent requests try to check out the same book, one will see a stale status after the other commits, and the business rule check will reject it.

**Example implementation**:

```javascript
const { BookNotFoundError, BookUnavailableError } = require('../errors');

function checkoutBook(db, id) {
  const checkout = db.transaction(() => {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    if (!book) throw new BookNotFoundError();
    if (book.status !== 'available') {
      throw new BookUnavailableError('Book is already checked out');
    }

    const now = new Date().toISOString();
    db.prepare(
      'UPDATE books SET status = ?, checked_out_at = ?, updated_at = ? WHERE id = ?'
    ).run('checked_out', now, now, id);

    return db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  });

  return checkout();
}

function returnBook(db, id) {
  const returnTx = db.transaction(() => {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    if (!book) throw new BookNotFoundError();
    if (book.status !== 'checked_out') {
      throw new BookUnavailableError('Book is not currently checked out');
    }

    const now = new Date().toISOString();
    db.prepare(
      'UPDATE books SET status = ?, checked_out_at = ?, updated_at = ? WHERE id = ?'
    ).run('available', null, now, id);

    return db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  });

  return returnTx();
}

module.exports = { checkoutBook, returnBook };
```

### `src/routes/books.js` — Modifications

Add two new route definitions on the existing books router.

#### Route: `POST /:id/checkout`

Middleware chain:
1. `param('id').isUUID(4).withMessage('ID must be a valid UUID v4')`
2. `validate`
3. Handler function

**Handler logic**:
```
1. Read `id` from `req.params.id`.
2. Call `checkoutBook(db, id)`.
3. On success, respond with `200` and the updated book object.
4. Catch `BookNotFoundError` → respond `404`.
5. Catch `BookUnavailableError` → respond `409`.
```

#### Route: `POST /:id/return`

Middleware chain:
1. `param('id').isUUID(4).withMessage('ID must be a valid UUID v4')`
2. `validate`
3. Handler function

**Handler logic**:
```
1. Read `id` from `req.params.id`.
2. Call `returnBook(db, id)`.
3. On success, respond with `200` and the updated book object.
4. Catch `BookNotFoundError` → respond `404`.
5. Catch `BookUnavailableError` → respond `409`.
```

**Error mapping in handlers**:

```javascript
const { BookNotFoundError, BookUnavailableError } = require('../errors');

// In the handler:
try {
  const updatedBook = checkoutBook(db, id);
  res.json(updatedBook);
} catch (err) {
  if (err instanceof BookNotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof BookUnavailableError) {
    return res.status(409).json({ error: err.message });
  }
  throw err; // Re-throw unexpected errors
}
```

---

## Tests

### `test/services/checkout.test.js` — Unit Tests for Checkout Service

Test setup:
- Create a fresh in-memory database in `beforeEach`.
- Run migrations.
- Seed a book with `status: "available"` for each test.

| # | Test Case | Setup | Action | Assertion |
|---|---|---|---|---|
| 1 | `checkoutBook` transitions `available` → `checked_out` | Seed available book | `checkoutBook(db, id)` | Returned book has `status: "checked_out"` |
| 2 | `checkoutBook` sets `checked_out_at` to valid ISO-8601 | Seed available book | `checkoutBook(db, id)` | `checked_out_at` is a valid ISO-8601 string, not `null` |
| 3 | `checkoutBook` throws `BookNotFoundError` for non-existent ID | Empty DB | `checkoutBook(db, 'nonexistent-uuid')` | Throws `BookNotFoundError` |
| 4 | `checkoutBook` throws `BookUnavailableError` when already checked out | Seed book, check it out | `checkoutBook(db, id)` again | Throws `BookUnavailableError` with message `"Book is already checked out"` |
| 5 | `returnBook` transitions `checked_out` → `available` | Seed book, check it out | `returnBook(db, id)` | Returned book has `status: "available"` |
| 6 | `returnBook` clears `checked_out_at` to `null` | Seed book, check it out | `returnBook(db, id)` | `checked_out_at` is `null` |
| 7 | `returnBook` throws `BookNotFoundError` for non-existent ID | Empty DB | `returnBook(db, 'nonexistent-uuid')` | Throws `BookNotFoundError` |
| 8 | `returnBook` throws `BookUnavailableError` when already available | Seed available book | `returnBook(db, id)` | Throws `BookUnavailableError` with message `"Book is not currently checked out"` |
| 9 | Full lifecycle: create → checkout → return → checkout succeeds | Seed available book | Checkout, return, checkout again | All three operations succeed; final status is `"checked_out"` |

### `test/routes/books.checkout.test.js` — POST /books/:id/checkout Integration Tests

| # | Test Case | Request | Expected Status | Expected Body |
|---|---|---|---|---|
| 1 | Successful checkout returns updated book | Seed book, `POST /books/:id/checkout` | `200` | Book with `status: "checked_out"` |
| 2 | Checkout non-existent book returns 404 | `POST /books/:nonexistentUuid/checkout` | `404` | `{ error: "Book not found" }` |
| 3 | Checkout already checked-out book returns 409 | Seed & checkout book, then checkout again | `409` | `{ error: "Book is already checked out" }` |
| 4 | Malformed UUID returns 400 | `POST /books/not-a-uuid/checkout` | `400` | `{ errors: [{ field: "id", ... }] }` |
| 5 | Response `status` field is `"checked_out"` | Seed & checkout | `200` | `body.status === "checked_out"` |
| 6 | Response `checked_out_at` is a valid timestamp | Seed & checkout | `200` | `body.checked_out_at` parses as a valid date |

### `test/routes/books.return.test.js` — POST /books/:id/return Integration Tests

| # | Test Case | Request | Expected Status | Expected Body |
|---|---|---|---|---|
| 1 | Successful return returns updated book | Seed & checkout book, `POST /books/:id/return` | `200` | Book with `status: "available"` |
| 2 | Return non-existent book returns 404 | `POST /books/:nonexistentUuid/return` | `404` | `{ error: "Book not found" }` |
| 3 | Return already available book returns 409 | Seed book (available), `POST /books/:id/return` | `409` | `{ error: "Book is not currently checked out" }` |
| 4 | Malformed UUID returns 400 | `POST /books/not-a-uuid/return` | `400` | `{ errors: [{ field: "id", ... }] }` |
| 5 | Response `status` field is `"available"` | Seed, checkout, return | `200` | `body.status === "available"` |
| 6 | Response `checked_out_at` is `null` | Seed, checkout, return | `200` | `body.checked_out_at === null` |

---

## Acceptance Criteria

- [ ] `src/errors.js` defines `AppError`, `BookNotFoundError`, and `BookUnavailableError` with correct `statusCode` values.
- [ ] `src/services/checkout.js` exports `checkoutBook` and `returnBook` functions.
- [ ] Both functions use `better-sqlite3` transactions for atomic read-then-write operations.
- [ ] `POST /books/:id/checkout` transitions an available book to checked out with correct timestamps.
- [ ] `POST /books/:id/return` transitions a checked-out book back to available and clears timestamps.
- [ ] Invalid state transitions return `409 Conflict` with descriptive messages.
- [ ] Non-existent book IDs return `404 Not Found`.
- [ ] Malformed UUIDs return `400 Bad Request`.
- [ ] All 9 service unit tests pass.
- [ ] All 12 route integration tests pass.
- [ ] All prior tier tests continue to pass.
- [ ] CI pipeline remains green.
- [ ] The state machine is enforced: only `available → checked_out` and `checked_out → available` transitions are allowed.
