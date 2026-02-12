TITLE:
Create centralized error handler middleware in src/middleware/errorHandler.js

BODY:
## Context

As part of **Tier 6: Error Handling, Logging & API Hardening**, the API needs a centralized error-handling middleware to replace ad-hoc error responses scattered across route handlers. This middleware will be the **final** middleware in the Express stack (four-argument signature) and will ensure every error — known or unexpected — is handled consistently and securely.

The middleware depends on the Pino logger factory (#164) for structured logging and imports `AppError` from `src/errors` to identify known application errors.

## Scope

Create `src/middleware/errorHandler.js` exporting a single Express error-handling middleware function `(err, req, res, next)` with the following behavior:

1. **Known application errors** (`AppError` and subclasses):
   - Import `AppError` from `../errors`.
   - Log at `warn` level via Pino with `{ err, statusCode: err.statusCode }`.
   - Respond with `res.status(err.statusCode).json({ error: err.message })`.

2. **JSON parse errors** (malformed body from `express.json()`):
   - Detect by checking `err.type === 'entity.parse.failed'`.
   - Respond with `400` and `{ error: 'Malformed JSON in request body' }`.

3. **All unknown/unexpected errors**:
   - Log the full error including stack trace at `error` level via Pino.
   - Respond with `500` and `{ error: 'Internal server error' }`.
   - **Never** leak stack traces, internal details, or original error messages to the client.

All error responses must follow the consistent shape `{ error: "string message" }`.

## Acceptance Criteria

- [ ] `src/middleware/errorHandler.js` exists and exports a four-argument Express middleware function `(err, req, res, next)`.
- [ ] `AppError` instances are caught, logged at `warn` level, and responded to with the correct `statusCode` and `{ error: err.message }`.
- [ ] Errors with `type === 'entity.parse.failed'` return `400` with `{ error: 'Malformed JSON in request body' }`.
- [ ] All other errors return `500` with `{ error: 'Internal server error' }` — no stack traces or internal details leak to the client.
- [ ] All 500-level errors are logged with full context (message + stack trace) via Pino at `error` level.
- [ ] Every error response follows the consistent JSON shape `{ error: "string message" }`.

## Implementation Notes

- Import the Pino logger from `../logger` (created in #164).
- Import `AppError` from `../errors` (the base class for all custom application errors such as `BookNotFoundError`, `BookUnavailableError`, etc.).
- Use `instanceof AppError` to detect known errors — this covers all subclasses automatically.
- The `entity.parse.failed` check handles `SyntaxError` instances thrown by `express.json()` when the request body contains malformed JSON.
- This middleware must be registered as the **last** middleware in the Express stack to catch all errors (integration into `app.js` is handled in a subsequent task).
- Reference implementation:

```javascript
const logger = require('../logger');
const { AppError } = require('../errors');

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    logger.warn({ err, statusCode: err.statusCode }, err.message);
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON in request body' });
  }

  logger.error({ err, stack: err.stack }, 'Unhandled error');
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
```

## Dependencies

- #164 — Pino logger factory (`src/logger.js`) must exist before this middleware can import it.

## References

- Tasks file: `plan\tasks\tasks-tier-6-error-handling-hardening.json`
- Tier document: `plan\tiers\tier-6-error-handling-hardening.md`
