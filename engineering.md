# Book API — Engineering Document

---

## Tier 1: Foundation & Continuous Integration

### Objective

Stand up the Node.js project skeleton, install core dependencies, configure the test runner, wire a GitHub Actions CI pipeline, and expose a single health-check endpoint — proving the full build-test-deploy loop works end-to-end before any business logic is introduced.

### Dependencies

| Package | Purpose |
|---|---|
| `express` | HTTP framework |
| `jest` | Test runner |
| `supertest` | HTTP assertion library for integration tests |
| `dotenv` | Environment variable management |

### Project Structure

```
src/
  app.js            # Express app factory (does not listen)
  server.js          # Entry point — imports app and calls listen()
  routes/
    health.js        # GET /health
test/
  health.test.js     # Integration tests for the health endpoint
.github/
  workflows/
    ci.yml           # GitHub Actions workflow
.env.example
package.json
jest.config.js
```

### Implementation Details

**`src/app.js`** — Express application factory. Creates and configures the Express instance, mounts route files, and exports the app without calling `.listen()`. This separation allows `supertest` to bind the app to an ephemeral port during tests.

**`src/server.js`** — Production entry point. Imports the app and starts listening on `process.env.PORT` (default `3000`). This file is excluded from test coverage.

**`src/routes/health.js`** — Single route module exposing `GET /health`. Returns `{ "status": "ok" }` with a `200` status code. Acts as the smoke-test surface for CI.

**`jest.config.js`** — Configures Jest with the `node` test environment, sets coverage thresholds (statements, branches, functions, lines all at 80 %), and maps the `test/` directory as the test root.

### GitHub Actions CI Workflow

**`.github/workflows/ci.yml`**

Triggers on `push` and `pull_request` against `main`.

Steps:

1. Checkout repository.
2. Setup Node.js (LTS matrix: 18.x, 20.x).
3. `npm ci` — deterministic install from lockfile.
4. `npm test` — runs `jest --coverage --forceExit`.
5. Upload coverage artifact (optional but recommended).

The pipeline must pass before any PR is merged.

### Tests (Tier 1)

| Test File | Cases |
|---|---|
| `test/health.test.js` | `GET /health` returns `200` with `{ status: "ok" }` |
| | Response `Content-Type` is `application/json` |
| | Unknown route returns `404` |

### Acceptance Criteria

- `npm test` passes locally.
- GitHub Actions workflow succeeds on push.
- Coverage report is generated and meets the 80 % threshold.

---

## Tier 2: Data Persistence & Book Model

### Objective

Introduce a persistence layer, define the Book data model, implement database lifecycle management (connection, migrations, teardown), and validate the model in isolation through unit tests.

### Dependencies

| Package | Purpose |
|---|---|
| `better-sqlite3` | Synchronous SQLite driver (zero-config, file or in-memory) |
| `uuid` | Generate unique book identifiers |

### Project Structure (additions)

```
src/
  db/
    connection.js     # Database connection factory
    migrate.js        # Schema migration runner
    migrations/
      001_create_books.sql
  models/
    book.js           # Book data-access object
test/
  models/
    book.test.js      # Unit tests for the Book model
```

### Book Schema

| Column | Type | Constraints |
|---|---|---|
| `id` | `TEXT` | Primary key, UUID v4 |
| `title` | `TEXT` | Not null |
| `author` | `TEXT` | Not null |
| `isbn` | `TEXT` | Not null, unique |
| `published_year` | `INTEGER` | Not null |
| `status` | `TEXT` | Not null, default `"available"` — enum: `available`, `checked_out` |
| `checked_out_at` | `TEXT` | Nullable, ISO-8601 timestamp |
| `created_at` | `TEXT` | Not null, defaults to current timestamp |
| `updated_at` | `TEXT` | Not null, defaults to current timestamp |

### Implementation Details

**`src/db/connection.js`** — Exports a function `getDatabase(filepath)` that returns a `better-sqlite3` instance. When `NODE_ENV=test`, the filepath defaults to `:memory:` so tests run without disk I/O and are fully isolated.

**`src/db/migrate.js`** — Reads `.sql` files from `migrations/` in lexicographic order and executes them inside a transaction. Tracks applied migrations in a `_migrations` meta-table to avoid re-running.

**`src/models/book.js`** — Data-access object exposing the following methods. Each method accepts the `db` instance as its first argument (dependency injection for testability):

| Method | Signature | Description |
|---|---|---|
| `create` | `(db, { title, author, isbn, published_year }) → Book` | Inserts a new book, returns the created record |
| `findById` | `(db, id) → Book \| null` | Retrieves a single book by UUID |
| `findAll` | `(db, { limit, offset }) → Book[]` | Paginated list of all books |
| `update` | `(db, id, fields) → Book \| null` | Partial update, sets `updated_at` |

All write methods validate required fields and throw descriptive errors on constraint violations (e.g., duplicate ISBN).

### Tests (Tier 2)

| Test File | Cases |
|---|---|
| `test/models/book.test.js` | `create` inserts a book and returns it with a generated `id` |
| | `create` rejects duplicate ISBN with a descriptive error |
| | `create` rejects missing required fields |
| | `findById` returns `null` for a non-existent ID |
| | `findById` returns the correct book |
| | `findAll` returns an empty array when no books exist |
| | `findAll` respects `limit` and `offset` pagination |
| | `update` modifies only supplied fields and bumps `updated_at` |
| | Migrations are idempotent (running twice does not error) |

Each test file sets up an in-memory database in `beforeEach` and closes it in `afterEach`.

### Acceptance Criteria

- All Tier 1 tests continue to pass.
- All Tier 2 model tests pass.
- CI pipeline remains green.
- Database file is git-ignored; tests use in-memory databases exclusively.

---

## Tier 3: Create Book & List Books Endpoints

### Objective

Expose the first two RESTful endpoints — `POST /books` (create) and `GET /books` (list) — wire them through the Express router to the Book model, add request validation middleware, and cover both endpoints with integration tests.

### Dependencies

| Package | Purpose |
|---|---|
| `express-validator` | Declarative request validation and sanitization |

### Project Structure (additions)

```
src/
  routes/
    books.js          # Book route definitions
  middleware/
    validate.js       # Generic validation error handler
test/
  routes/
    books.create.test.js
    books.list.test.js
```

### Endpoint Specifications

#### `POST /books`

| Aspect | Detail |
|---|---|
| Request body | `{ title, author, isbn, published_year }` — all required |
| Validation | `title`: non-empty string, max 255 chars. `author`: non-empty string, max 255 chars. `isbn`: valid ISBN-10 or ISBN-13 format. `published_year`: integer, 1000–current year. |
| Success | `201 Created` — returns the created book object |
| Failure (validation) | `400 Bad Request` — returns `{ errors: [{ field, message }] }` |
| Failure (duplicate ISBN) | `409 Conflict` — returns `{ error: "A book with this ISBN already exists" }` |

#### `GET /books`

| Aspect | Detail |
|---|---|
| Query params | `page` (default 1), `limit` (default 20, max 100) |
| Success | `200 OK` — returns `{ data: Book[], pagination: { page, limit, total } }` |
| Validation | `page` and `limit` must be positive integers. Invalid values fall back to defaults. |

### Implementation Details

**`src/middleware/validate.js`** — A higher-order middleware that calls `validationResult(req)` from `express-validator`. If errors exist, it short-circuits with a `400` response containing a normalized error array. Otherwise, it calls `next()`.

**`src/routes/books.js`** — Defines the Express router. Each route is composed of validation chains followed by the validate middleware and the handler function. The handler delegates to `models/book.js` and formats the response.

**`src/app.js`** (modified) — Mounts `routes/books.js` at `/books`. Adds `express.json()` body-parsing middleware.

### Tests (Tier 3)

| Test File | Cases |
|---|---|
| `test/routes/books.create.test.js` | `201` — valid payload creates a book and returns it |
| | `400` — missing `title` returns validation error |
| | `400` — missing `author` returns validation error |
| | `400` — invalid ISBN format returns validation error |
| | `400` — `published_year` out of range returns validation error |
| | `400` — empty body returns all field errors |
| | `409` — duplicate ISBN returns conflict error |
| | Response includes `id`, `created_at`, `status: "available"` |
| `test/routes/books.list.test.js` | `200` — returns empty `data` array when no books exist |
| | `200` — returns seeded books with correct count |
| | Pagination defaults (`page=1`, `limit=20`) are applied |
| | Custom `page` and `limit` query params work correctly |
| | `limit` is capped at 100 |
| | Response includes `pagination` object with `total` |

### Acceptance Criteria

- All Tier 1 and Tier 2 tests continue to pass.
- All Tier 3 integration tests pass.
- CI pipeline remains green.
- Invalid requests never reach the model layer.

---

## Tier 4: View Book Endpoint

### Objective

Implement the `GET /books/:id` endpoint that returns a single book by its UUID, handle the not-found case gracefully, and add integration tests.

### Project Structure (additions)

```
test/
  routes/
    books.view.test.js
```

### Endpoint Specification

#### `GET /books/:id`

| Aspect | Detail |
|---|---|
| Path param | `id` — UUID v4 format |
| Validation | `id` must be a valid UUID v4. If not, return `400`. |
| Success | `200 OK` — returns the full book object |
| Not found | `404 Not Found` — returns `{ error: "Book not found" }` |

### Implementation Details

**`src/routes/books.js`** (modified) — Add a new route definition for `GET /:id`. A validation chain checks that `id` matches UUID v4 format. The handler calls `book.findById(db, id)` and returns the result or a `404`.

### Tests (Tier 4)

| Test File | Cases |
|---|---|
| `test/routes/books.view.test.js` | `200` — returns the correct book for a valid, existing ID |
| | `404` — returns error for a valid UUID that does not exist |
| | `400` — returns validation error for a malformed (non-UUID) ID |
| | Response body matches the full book schema (all fields present) |
| | `status` field accurately reflects current book state |

### Acceptance Criteria

- All prior tier tests continue to pass.
- All Tier 4 tests pass.
- CI pipeline remains green.
- Requesting a non-existent book never throws an unhandled exception.

---

## Tier 5: Checkout & Return System

### Objective

Implement the book checkout and return lifecycle — `POST /books/:id/checkout` and `POST /books/:id/return`. Enforce business rules around availability state transitions, record timestamps, and thoroughly test both happy paths and all error branches.

### Project Structure (additions)

```
src/
  services/
    checkout.js       # Business logic for checkout/return operations
test/
  services/
    checkout.test.js  # Unit tests for checkout business logic
  routes/
    books.checkout.test.js
    books.return.test.js
```

### Endpoint Specifications

#### `POST /books/:id/checkout`

| Aspect | Detail |
|---|---|
| Path param | `id` — UUID v4 |
| Precondition | Book must exist and have `status: "available"` |
| Side effects | Sets `status` to `"checked_out"`, sets `checked_out_at` to current ISO-8601 timestamp, bumps `updated_at` |
| Success | `200 OK` — returns the updated book object |
| Not found | `404 Not Found` — `{ error: "Book not found" }` |
| Already checked out | `409 Conflict` — `{ error: "Book is already checked out" }` |

#### `POST /books/:id/return`

| Aspect | Detail |
|---|---|
| Path param | `id` — UUID v4 |
| Precondition | Book must exist and have `status: "checked_out"` |
| Side effects | Sets `status` to `"available"`, clears `checked_out_at` to `null`, bumps `updated_at` |
| Success | `200 OK` — returns the updated book object |
| Not found | `404 Not Found` — `{ error: "Book not found" }` |
| Not checked out | `409 Conflict` — `{ error: "Book is not currently checked out" }` |

### Implementation Details

**`src/services/checkout.js`** — Pure business logic module, decoupled from HTTP concerns. Exports two functions:

| Function | Behavior |
|---|---|
| `checkoutBook(db, id)` | Loads book, validates status is `"available"`, performs update atomically, returns updated book. Throws typed errors (`BookNotFoundError`, `BookUnavailableError`) for known failure modes. |
| `returnBook(db, id)` | Loads book, validates status is `"checked_out"`, performs update atomically, returns updated book. Throws typed errors for known failure modes. |

Both functions wrap their read-then-write in a `better-sqlite3` transaction to prevent race conditions.

**Custom Error Classes** — Defined in `src/errors.js`:

| Error Class | HTTP Status | Usage |
|---|---|---|
| `BookNotFoundError` | 404 | Book ID does not exist |
| `BookUnavailableError` | 409 | State transition is invalid |

**`src/routes/books.js`** (modified) — Two new route definitions delegate to the checkout service. The handler catches typed errors and maps them to the appropriate HTTP response.

### Tests (Tier 5)

| Test File | Cases |
|---|---|
| `test/services/checkout.test.js` | `checkoutBook` transitions `available` → `checked_out` |
| | `checkoutBook` sets `checked_out_at` to a valid ISO-8601 timestamp |
| | `checkoutBook` throws `BookNotFoundError` for non-existent ID |
| | `checkoutBook` throws `BookUnavailableError` when already checked out |
| | `returnBook` transitions `checked_out` → `available` |
| | `returnBook` clears `checked_out_at` to `null` |
| | `returnBook` throws `BookNotFoundError` for non-existent ID |
| | `returnBook` throws `BookUnavailableError` when already available |
| | Full cycle: create → checkout → return → checkout succeeds again |
| `test/routes/books.checkout.test.js` | `200` — successful checkout returns updated book |
| | `404` — checkout non-existent book |
| | `409` — checkout an already checked-out book |
| | `400` — malformed UUID in path |
| | Response `status` field is `"checked_out"` |
| | Response `checked_out_at` is a valid timestamp |
| `test/routes/books.return.test.js` | `200` — successful return returns updated book |
| | `404` — return non-existent book |
| | `409` — return a book that is already available |
| | `400` — malformed UUID in path |
| | Response `status` field is `"available"` |
| | Response `checked_out_at` is `null` |

### Acceptance Criteria

- All prior tier tests continue to pass.
- All Tier 5 unit and integration tests pass.
- CI pipeline remains green.
- No race conditions in checkout/return under concurrent access (transaction-guarded).
- State machine is enforced: only valid transitions are permitted.

---

## Tier 6: Error Handling, Logging & API Hardening

### Objective

Add a centralized error-handling middleware, structured request/response logging, input sanitization, rate limiting, and comprehensive edge-case tests to harden the API for production readiness.

### Dependencies

| Package | Purpose |
|---|---|
| `pino` | High-performance structured JSON logger |
| `pino-http` | Express middleware for automatic request logging |
| `express-rate-limit` | Rate limiting middleware |
| `helmet` | Security headers |

### Project Structure (additions)

```
src/
  middleware/
    errorHandler.js   # Centralized error-handling middleware
    rateLimiter.js    # Rate limiting configuration
  errors.js           # Custom error class hierarchy (if not already created in Tier 5)
  logger.js           # Pino logger factory
test/
  middleware/
    errorHandler.test.js
  integration/
    rateLimit.test.js
    edgeCases.test.js
```

### Implementation Details

**`src/middleware/errorHandler.js`** — Final Express error-handling middleware (four-argument signature). Behavior:

1. If the error is an instance of a known custom error (`BookNotFoundError`, `BookUnavailableError`, `ValidationError`), map it to its designated HTTP status and structured JSON body.
2. For all unknown errors, log the full stack trace at `error` level and return a generic `500 Internal Server Error` with `{ error: "Internal server error" }`. Never leak stack traces or internal details to the client.

**`src/logger.js`** — Configures Pino with environment-aware settings: `pretty` transport in development, raw JSON in production, `silent` level in test.

**`src/middleware/rateLimiter.js`** — Configures `express-rate-limit` with a default window of 15 minutes and 100 requests per IP. Returns a `429 Too Many Requests` response with a `Retry-After` header.

**`src/app.js`** (modified) — Applies middleware in order: `helmet()`, `pino-http`, `express.json()`, `rateLimiter`, routes, `errorHandler`. Adds a catch-all handler for JSON parse errors from malformed request bodies.

### Tests (Tier 6)

| Test File | Cases |
|---|---|
| `test/middleware/errorHandler.test.js` | Known error types map to correct HTTP status codes |
| | Unknown errors return generic `500` without leaking details |
| | Error responses always have consistent JSON shape |
| | Logging is invoked for `500`-level errors |
| `test/integration/rateLimit.test.js` | Requests within the limit succeed normally |
| | Exceeding the limit returns `429` with `Retry-After` header |
| `test/integration/edgeCases.test.js` | Malformed JSON body returns `400` (not `500`) |
| | Extremely long string fields are rejected or truncated |
| | SQL injection attempts in query params are neutralized |
| | Request with unexpected `Content-Type` returns `400` |
| | Concurrent checkout requests for the same book — one succeeds, one gets `409` |
| | `GET /books` with negative page number falls back to defaults |
| | `POST /books` with extra unknown fields — extra fields are stripped or ignored |

### Acceptance Criteria

- All prior tier tests continue to pass.
- All Tier 6 tests pass.
- CI pipeline remains green.
- No unhandled promise rejections or uncaught exceptions in any code path.
- All `500` errors are logged with full context; no internal details reach the client.
- Rate limiting is active and testable.

---

## Tier 7: API Documentation & Developer Experience

### Objective

Generate an OpenAPI 3.0 specification from the implemented routes, serve interactive documentation via Swagger UI, add a `GET /books/:id/history` endpoint for audit visibility into checkout/return events, and ensure the documentation itself is validated in CI.

### Dependencies

| Package | Purpose |
|---|---|
| `swagger-ui-express` | Serves interactive Swagger UI |
| `swagger-jsdoc` | Generates OpenAPI spec from JSDoc annotations |

### Project Structure (additions)

```
src/
  db/
    migrations/
      002_create_checkout_history.sql
  models/
    checkoutHistory.js   # Data-access for checkout/return event log
  docs/
    swagger.js           # OpenAPI spec generation config
  routes/
    books.js             # (modified) — adds /:id/history route
test/
  models/
    checkoutHistory.test.js
  routes/
    books.history.test.js
  docs/
    swagger.test.js
```

### Checkout History Schema

| Column | Type | Constraints |
|---|---|---|
| `id` | `TEXT` | Primary key, UUID v4 |
| `book_id` | `TEXT` | Foreign key → `books.id`, not null |
| `action` | `TEXT` | Not null, enum: `checked_out`, `returned` |
| `timestamp` | `TEXT` | Not null, ISO-8601 |

### Endpoint Specification

#### `GET /books/:id/history`

| Aspect | Detail |
|---|---|
| Path param | `id` — UUID v4 |
| Query params | `page` (default 1), `limit` (default 20, max 100) |
| Success | `200 OK` — `{ data: HistoryEntry[], pagination: { page, limit, total } }` |
| Not found | `404 Not Found` — if the book does not exist |

### Implementation Details

**`src/services/checkout.js`** (modified) — After each successful checkout or return, insert a row into the `checkout_history` table within the same transaction.

**`src/models/checkoutHistory.js`** — Exposes `findByBookId(db, bookId, { limit, offset })` for paginated history retrieval.

**`src/docs/swagger.js`** — Uses `swagger-jsdoc` to scan route files for JSDoc/OpenAPI annotations and produces a complete OpenAPI 3.0 spec object. Mounted at `/docs` via `swagger-ui-express`.

**JSDoc Annotations** — Each route handler in `src/routes/books.js` is annotated with `@openapi` blocks describing path, parameters, request body, and all response codes with schema references.

### Tests (Tier 7)

| Test File | Cases |
|---|---|
| `test/models/checkoutHistory.test.js` | History entry is created on checkout |
| | History entry is created on return |
| | `findByBookId` returns entries in reverse chronological order |
| | `findByBookId` respects pagination |
| | `findByBookId` returns empty array for a book with no history |
| `test/routes/books.history.test.js` | `200` — returns checkout/return events for a book |
| | `404` — book does not exist |
| | `400` — malformed UUID |
| | Pagination query params work correctly |
| | History reflects full checkout → return cycle |
| `test/docs/swagger.test.js` | Generated OpenAPI spec is valid against the OpenAPI 3.0 JSON schema |
| | Every defined route has a corresponding path in the spec |
| | All response codes used by the API are documented in the spec |

### CI Additions

- Add a CI step that runs `swagger.test.js` to validate the OpenAPI spec on every push.
- The spec validation failing blocks the build, ensuring documentation never drifts from the implementation.

### Acceptance Criteria

- All prior tier tests continue to pass.
- All Tier 7 tests pass.
- CI pipeline remains green (including spec validation step).
- Swagger UI is accessible at `/docs` and accurately reflects every endpoint.
- Checkout history provides a complete audit trail for every state change.
