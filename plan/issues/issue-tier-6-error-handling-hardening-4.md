TITLE:
Create rate limiter middleware in src/middleware/rateLimiter.js

BODY:
## Context

This task is part of **Tier 6: Error Handling, Logging & API Hardening**, which adds centralized error handling, structured logging, input sanitization, rate limiting, and security headers to make the API production-ready.

The rate limiter middleware uses `express-rate-limit` to enforce IP-based request throttling, protecting the API from abuse and denial-of-service attacks. It will be integrated into the Express middleware stack (in a subsequent task) between body parsing and route handlers.

## Acceptance Criteria

- [ ] `src/middleware/rateLimiter.js` exists and exports a configured `express-rate-limit` instance.
- [ ] `windowMs` is set to `15 * 60 * 1000` (15-minute rolling window).
- [ ] `max` is set to `100` requests per IP per window.
- [ ] `standardHeaders` is `true` (returns `RateLimit-*` headers in responses).
- [ ] `legacyHeaders` is `false` (disables deprecated `X-RateLimit-*` headers).
- [ ] `message` is set to `{ error: 'Too many requests, please try again later' }` as the `429` response body.
- [ ] The 429 response body follows the consistent error shape `{ error: "string" }` used across all error responses.
- [ ] `windowMs` and `max` are configurable via environment variables (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`) or the module exports a factory function, so that tests can use lower limits without sending 100+ requests.

## Implementation Notes

### File: `src/middleware/rateLimiter.js`

Import `express-rate-limit` and export a configured rate limiter instance:

```javascript
const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

module.exports = rateLimiter;
```

### Configuration details

| Setting          | Default Value              | Notes                                      |
|------------------|----------------------------|---------------------------------------------|
| `windowMs`       | `15 * 60 * 1000` (15 min)  | Rolling time window for request counting    |
| `max`            | `100`                      | Max requests per IP per window              |
| `standardHeaders`| `true`                     | Returns RFC-compliant `RateLimit-*` headers |
| `legacyHeaders`  | `false`                    | Disables deprecated `X-RateLimit-*` headers |
| `message`        | `{ error: "Too many..." }` | JSON body returned on 429 responses         |

### Testing considerations

- Export a factory function or support env vars (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`) so integration tests in `test/integration/rateLimit.test.js` can set a low limit (e.g., `max: 5`) without needing to send 100+ requests.
- The rate limiter will be mounted in `src/app.js` after `express.json()` and before routes (handled by a separate task).

### Middleware stack position (for reference)

This middleware will be placed 4th in the stack:
1. `helmet()` — security headers
2. `pino-http(logger)` — request logging
3. `express.json()` — body parsing
4. **`rateLimiter`** — rate limiting (this task)
5. Routes
6. 404 catch-all
7. `errorHandler` — centralized error handler

## Dependencies

- #163 — Install error handling, logging, and hardening dependencies (`express-rate-limit` must be installed first)

## References

- Tasks file: `plan\tasks\tasks-tier-6-error-handling-hardening.json`
- Tier document: `plan\tiers\tier-6-error-handling-hardening.md`
