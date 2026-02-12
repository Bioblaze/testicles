# Tier 6: Error Handling, Logging & API Hardening

---

## Objective

Add a centralized error-handling middleware, structured request/response logging, input sanitization, rate limiting, and security headers. Cover all hardening measures with comprehensive edge-case tests to ensure the API is production-ready and resilient against malformed input, abuse, and unexpected failures.

---

## Dependencies

| Package | Version Strategy | Purpose |
|---|---|---|
| `pino` | latest | High-performance structured JSON logger |
| `pino-http` | latest | Express middleware for automatic request/response logging |
| `express-rate-limit` | latest | IP-based rate limiting middleware |
| `helmet` | latest | Sets security-related HTTP response headers |

Install command:

```bash
npm install pino pino-http express-rate-limit helmet
```

Optional dev dependency for readable logs during development:

```bash
npm install --save-dev pino-pretty
```

---

## Project Structure (additions)

```
src/
├── logger.js                       # Pino logger factory
└── middleware/
    ├── errorHandler.js             # Centralized error-handling middleware
    └── rateLimiter.js              # Rate limiting configuration
test/
├── middleware/
│   └── errorHandler.test.js        # Unit tests for error handler
└── integration/
    ├── rateLimit.test.js           # Integration tests for rate limiting
    └── edgeCases.test.js           # Edge-case and hardening tests
```

---

## File-by-File Implementation Details

### `src/logger.js` — Pino Logger Factory

Creates and exports a configured Pino logger instance with environment-aware settings.

**Configuration**:

| Environment | Log Level | Transport |
|---|---|---|
| `development` | `debug` | `pino-pretty` (human-readable, colorized) |
| `production` | `info` | Raw JSON to stdout (for log aggregation) |
| `test` | `silent` | No output (keeps test output clean) |

**Example**:

```javascript
const pino = require('pino');

const logger = pino({
  level: process.env.NODE_ENV === 'test'
    ? 'silent'
    : process.env.NODE_ENV === 'production'
      ? 'info'
      : 'debug',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

module.exports = logger;
```

### `src/middleware/errorHandler.js` — Centralized Error Handler

The **final** Express middleware in the stack (four-argument signature: `err, req, res, next`).

**Behavior**:

1. **Known custom errors** (`AppError` and its subclasses):
   - Read `err.statusCode` and `err.message`.
   - Respond with the appropriate HTTP status and `{ error: err.message }`.
   - Log at `warn` level (client errors are expected, not critical).

2. **JSON parse errors** (from `express.json()` when the body is malformed):
   - Detect by checking `err.type === 'entity.parse.failed'`.
   - Respond with `400 Bad Request` and `{ error: "Malformed JSON in request body" }`.

3. **All unknown/unexpected errors**:
   - Log the full error (message + stack trace) at `error` level using Pino.
   - Respond with `500 Internal Server Error` and `{ error: "Internal server error" }`.
   - **Never** leak stack traces, internal details, or error messages to the client.

**Example**:

```javascript
const logger = require('../logger');
const { AppError } = require('../errors');

function errorHandler(err, req, res, next) {
  // Known application errors
  if (err instanceof AppError) {
    logger.warn({ err, statusCode: err.statusCode }, err.message);
    return res.status(err.statusCode).json({ error: err.message });
  }

  // JSON parse errors from express.json()
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON in request body' });
  }

  // Unexpected errors — log and return generic 500
  logger.error({ err, stack: err.stack }, 'Unhandled error');
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
```

**Consistent JSON shape**: Every error response from this middleware follows the format `{ error: "string message" }`, ensuring clients can rely on a consistent structure.

### `src/middleware/rateLimiter.js` — Rate Limiting

Configures `express-rate-limit` with sensible defaults.

**Configuration**:

| Setting | Value | Notes |
|---|---|---|
| `windowMs` | `15 * 60 * 1000` (15 minutes) | Rolling time window |
| `max` | `100` | Maximum requests per IP per window |
| `standardHeaders` | `true` | Returns `RateLimit-*` headers |
| `legacyHeaders` | `false` | Disables `X-RateLimit-*` headers |
| `message` | `{ error: "Too many requests, please try again later" }` | Response body on `429` |

**Example**:

```javascript
const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

module.exports = rateLimiter;
```

For testing, consider making `windowMs` and `max` configurable via environment variables or a factory function to enable lower limits in tests.

### `src/app.js` — Middleware Stack Modifications

The middleware must be applied in a specific order for correct behavior:

```
1. helmet()                  — Security headers (first, before any response)
2. pino-http(logger)         — Request/response logging
3. express.json()            — Body parsing (catches malformed JSON)
4. rateLimiter               — Rate limiting
5. Routes                    — Health, books
6. 404 catch-all             — Unknown routes
7. errorHandler              — Centralized error handler (MUST be last)
```

**Key change**: Move the 404 catch-all and error handler to their correct positions. The error handler must be the absolute last middleware registered.

**Malformed JSON handling**: `express.json()` will throw a `SyntaxError` with `type: 'entity.parse.failed'` for invalid JSON. The centralized `errorHandler` catches this and returns `400` instead of `500`.

---

## Tests

### `test/middleware/errorHandler.test.js` — Error Handler Unit Tests

Test the error handler in isolation by invoking it directly with mock `req`, `res`, and `next` objects.

| # | Test Case | Input Error | Expected Status | Expected Body |
|---|---|---|---|---|
| 1 | `BookNotFoundError` maps to 404 | `new BookNotFoundError()` | `404` | `{ error: "Book not found" }` |
| 2 | `BookUnavailableError` maps to 409 | `new BookUnavailableError("Book is already checked out")` | `409` | `{ error: "Book is already checked out" }` |
| 3 | Unknown `Error` returns generic 500 | `new Error("something broke")` | `500` | `{ error: "Internal server error" }` |
| 4 | Unknown error does NOT leak details | `new Error("DB connection failed at host:5432")` | `500` | Body does NOT contain `"DB connection"` or `"5432"` |
| 5 | JSON parse error returns 400 | `{ type: 'entity.parse.failed' }` | `400` | `{ error: "Malformed JSON in request body" }` |
| 6 | All error responses have consistent shape | Various errors | Various | Body always has an `error` key with a string value |

### `test/integration/rateLimit.test.js` — Rate Limiting Integration Tests

Configure a low rate limit for testing (e.g., `max: 5` per window).

| # | Test Case | Action | Expected Result |
|---|---|---|---|
| 1 | Requests within the limit succeed | Send 5 requests to `GET /health` | All return `200` |
| 2 | Exceeding the limit returns 429 | Send 6 requests to `GET /health` | 6th request returns `429` |
| 3 | 429 response includes Retry-After header | Exceed the limit | Response has `retry-after` header |
| 4 | 429 response body is JSON | Exceed the limit | `{ error: "Too many requests, please try again later" }` |

### `test/integration/edgeCases.test.js` — Edge Case & Hardening Tests

| # | Test Case | Request | Expected Status | Expected Behavior |
|---|---|---|---|---|
| 1 | Malformed JSON body returns 400 | `POST /books` with body `"{ invalid json }"` (raw string, `Content-Type: application/json`) | `400` | `{ error: "Malformed JSON in request body" }` — NOT `500` |
| 2 | Extremely long string fields are rejected | `POST /books` with `title` of 10,000 characters | `400` | Validation error for title length |
| 3 | SQL injection in query params is neutralized | `GET /books?page=1;DROP TABLE books` | `200` or `400` | Table is NOT dropped; response is normal or validation error |
| 4 | SQL injection in body fields is neutralized | `POST /books` with `title: "'; DROP TABLE books; --"` | `201` or `400` | If validation passes, the literal string is stored safely (parameterized queries prevent injection) |
| 5 | Unexpected Content-Type returns 400 | `POST /books` with `Content-Type: text/plain` | `400` or `415` | Request is rejected, body is not parsed |
| 6 | Concurrent checkout of same book | Two simultaneous `POST /books/:id/checkout` requests | One `200`, one `409` | Transaction isolation prevents double-checkout |
| 7 | `GET /books` with negative page number | `GET /books?page=-1` | `200` | Falls back to default `page: 1` |
| 8 | `POST /books` with extra unknown fields | `POST /books` with `{ ...validFields, foo: "bar" }` | `201` | Extra fields are ignored; created book does NOT contain `foo` |
| 9 | Empty request body to POST | `POST /books` with no body at all | `400` | Validation errors for all required fields |
| 10 | Request with `Content-Length: 0` to POST | `POST /books` with empty body | `400` | Validation errors, not a 500 |

---

## Acceptance Criteria

- [ ] `pino`, `pino-http`, `express-rate-limit`, and `helmet` are installed and listed in `package.json`.
- [ ] `src/logger.js` produces silent output in test, pretty output in development, and JSON output in production.
- [ ] `src/middleware/errorHandler.js` maps known errors to correct HTTP statuses and returns generic 500 for unknown errors.
- [ ] No stack traces or internal error details are ever sent to the client.
- [ ] All 500-level errors are logged with full context via Pino.
- [ ] `src/middleware/rateLimiter.js` enforces rate limits with a 15-minute window and 100-request cap.
- [ ] `helmet()` is applied to all responses (security headers present).
- [ ] Malformed JSON in request bodies returns `400`, not `500`.
- [ ] All 6 error handler tests pass.
- [ ] All 4 rate limit tests pass.
- [ ] All 10 edge-case tests pass.
- [ ] All prior tier tests continue to pass.
- [ ] CI pipeline remains green.
- [ ] No unhandled promise rejections or uncaught exceptions in any tested code path.
