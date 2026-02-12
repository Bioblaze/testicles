TITLE:
Integrate all new middleware into src/app.js in correct order

BODY:
## Context

This task is part of **Tier 6: Error Handling, Logging & API Hardening**, which adds centralized error handling, structured logging, rate limiting, and security headers to make the API production-ready and resilient.

With the Pino logger (#164), centralized error handler (#165), and rate limiter (#166) now implemented as standalone modules, they need to be wired into the Express application. The middleware registration order in `src/app.js` is critical — incorrect ordering can cause security headers to be missing from error responses, logging to miss certain requests, or the error handler to never receive thrown errors.

This task modifies `src/app.js` to import and register all new middleware in the precise order required for correct behavior.

## Acceptance Criteria

- [ ] `helmet` is imported and `helmet()` is the **first** middleware registered, ensuring security headers are set on every response (including error responses).
- [ ] `pino-http` is imported and configured with the Pino logger from `src/logger.js`, registered **second** for automatic request/response logging.
- [ ] `express.json()` remains in place as the **third** middleware for body parsing (already exists — do not duplicate).
- [ ] `rateLimiter` from `src/middleware/rateLimiter.js` is imported and registered **fourth**, after body parsing and before routes.
- [ ] Existing routes (health, books) remain registered in their current order after all pre-route middleware.
- [ ] A 404 catch-all handler is registered **after** all route definitions, returning a consistent JSON error response for unknown routes.
- [ ] `errorHandler` from `src/middleware/errorHandler.js` is imported and registered as the **absolute last** middleware (four-argument Express error handler).
- [ ] No existing route behavior is broken by the middleware changes.
- [ ] All prior tier tests continue to pass after integration.
- [ ] Security headers (from `helmet`) are present on all responses, including error responses.
- [ ] Malformed JSON in request bodies is caught by `express.json()` and handled by the centralized `errorHandler`, returning `400` (not `500`).

## Implementation Notes

### Required imports

Add the following imports to `src/app.js`:

```javascript
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const logger = require('./logger');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
```

### Middleware stack order

The complete middleware stack must follow this exact order:

| Position | Middleware | Purpose |
|----------|-----------|---------|
| 1 | `app.use(helmet())` | Security headers — must be first so headers are set on every response |
| 2 | `app.use(pinoHttp({ logger }))` | Structured request/response logging |
| 3 | `app.use(express.json())` | Body parsing — catches malformed JSON (throws `SyntaxError` with `type: 'entity.parse.failed'`) |
| 4 | `app.use(rateLimiter)` | IP-based rate limiting — after body parsing, before routes |
| 5 | Route handlers | Health check, books routes (existing) |
| 6 | 404 catch-all | Catch requests to undefined routes — must come after all routes |
| 7 | `app.use(errorHandler)` | Centralized error handler — **MUST be the absolute last middleware** |

### 404 catch-all handler

Place this after all route definitions and before the error handler:

```javascript
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});
```

### Key considerations

- **Order matters**: `helmet()` must be first because it sets response headers. If placed after routes, error responses from earlier middleware would lack security headers.
- **`pino-http` before routes**: Ensures every request/response pair is logged, including 404s and rate-limited requests.
- **`rateLimiter` after `express.json()`**: Rate limiting runs after body parsing so that malformed JSON errors are caught before rate limiting logic runs.
- **404 before `errorHandler`**: The 404 catch-all is a regular middleware (not an error handler), so it must precede the four-argument error handler.
- **`errorHandler` last**: Express only routes to four-argument middleware when `next(err)` is called. Placing it last ensures it catches all errors from any preceding middleware or route.
- **Do not duplicate `express.json()`**: It already exists in `app.js` — keep it in place at position 3.

## Dependencies

- #164 — Pino logger factory (`src/logger.js`) must exist for `pino-http` integration
- #165 — Centralized error handler (`src/middleware/errorHandler.js`) must exist for import
- #166 — Rate limiter middleware (`src/middleware/rateLimiter.js`) must exist for import

## References

- Tasks file: `plan\tasks\tasks-tier-6-error-handling-hardening.json`
- Tier document: `plan\tiers\tier-6-error-handling-hardening.md`
