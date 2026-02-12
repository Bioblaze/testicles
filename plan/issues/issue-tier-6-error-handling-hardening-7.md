TITLE:
Create rate limiting integration tests in test/integration/rateLimit.test.js

BODY:
## Context

This task is part of **Tier 6: Error Handling, Logging & API Hardening**, which adds centralized error handling, structured logging, input sanitization, rate limiting, and security headers to make the API production-ready and resilient against malformed input, abuse, and unexpected failures.

The rate limiter middleware (`src/middleware/rateLimiter.js`) is configured with a 15-minute window and 100-request cap in production. To verify its behavior without sending 100+ requests per test run, this task creates 4 integration tests using `supertest` against a test-specific app instance configured with a low rate limit (e.g., `max: 5` per window). These tests confirm that requests within the limit succeed, requests exceeding the limit receive HTTP `429`, the `429` response includes the `retry-after` header, and the response body matches the expected JSON error format.

## Acceptance Criteria

- [ ] `test/integration/rateLimit.test.js` is created with 4 passing integration tests.
- [ ] Test 1: **Requests within the limit succeed** — send 5 requests to `GET /health`, all return HTTP `200`.
- [ ] Test 2: **Exceeding the limit returns 429** — send 6 requests to `GET /health`, the 6th request returns HTTP `429`.
- [ ] Test 3: **429 response includes `retry-after` header** — after exceeding the limit, the response contains a `retry-after` header.
- [ ] Test 4: **429 response body is JSON** — after exceeding the limit, the response body matches `{ error: "Too many requests, please try again later" }`.
- [ ] The test uses a test-specific app instance or configuration with a low rate limit (`max: 5` or similar) and a short window to keep tests fast and deterministic.
- [ ] Tests use `supertest` for HTTP-level integration testing.
- [ ] All 4 tests pass when running `npm test`.
- [ ] All prior tier tests continue to pass.

## Implementation Notes

### Test-specific rate limit configuration

The production rate limiter uses `max: 100` with a 15-minute window, which is impractical for testing. There are two recommended approaches:

1. **Factory function approach** — if `src/middleware/rateLimiter.js` exports a factory function (e.g., `createRateLimiter({ max, windowMs })`), call it with test-friendly values.
2. **Separate test app instance** — create a minimal Express app in the test file that applies the same middleware stack but with `express-rate-limit` configured to `max: 5` and a short `windowMs` (e.g., 60000ms).

```javascript
const express = require('express');
const rateLimit = require('express-rate-limit');
const request = require('supertest');

function createTestApp() {
  const app = express();
  app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  }));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  return app;
}
```

### Test cases

| # | Test Case | Action | Expected Result |
|---|-----------|--------|-----------------|
| 1 | Requests within the limit succeed | Send 5 requests to `GET /health` | All return `200` |
| 2 | Exceeding the limit returns 429 | Send 6 requests to `GET /health` | 6th request returns `429` |
| 3 | 429 response includes Retry-After header | Exceed the limit | Response has `retry-after` header |
| 4 | 429 response body is JSON | Exceed the limit | `{ error: "Too many requests, please try again later" }` |

### Test 1 — requests within limit

Send exactly `max` requests (5) sequentially and assert each returns `200`:

```javascript
it('should allow requests within the rate limit', async () => {
  const app = createTestApp();
  for (let i = 0; i < 5; i++) {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  }
});
```

### Test 2 — exceeding the limit

Send `max + 1` requests (6) and assert the last one returns `429`:

```javascript
it('should return 429 when rate limit is exceeded', async () => {
  const app = createTestApp();
  for (let i = 0; i < 5; i++) {
    await request(app).get('/health');
  }
  const res = await request(app).get('/health');
  expect(res.status).toBe(429);
});
```

### Test 3 — retry-after header

After exceeding the limit, verify the `retry-after` header is present in the response:

```javascript
it('should include retry-after header when rate limit is exceeded', async () => {
  const app = createTestApp();
  for (let i = 0; i < 5; i++) {
    await request(app).get('/health');
  }
  const res = await request(app).get('/health');
  expect(res.headers).toHaveProperty('retry-after');
});
```

### Test 4 — JSON error body

Verify the `429` response body exactly matches the configured message:

```javascript
it('should return correct JSON error body when rate limit is exceeded', async () => {
  const app = createTestApp();
  for (let i = 0; i < 5; i++) {
    await request(app).get('/health');
  }
  const res = await request(app).get('/health');
  expect(res.body).toEqual({ error: 'Too many requests, please try again later' });
});
```

### Key considerations

- Each test should create a **fresh app instance** to ensure the rate limiter state is reset between tests, preventing cross-test pollution.
- The `supertest` agent reuses connections by default; using `request(app)` per call ensures each request goes through the rate limiter independently.
- The `standardHeaders: true` option is what causes the `retry-after` header to be included in `429` responses.
- Logger is set to `silent` in test environment (`NODE_ENV=test`), so `pino-http` middleware output will not pollute test results.

## Dependencies

- #167 — All new middleware integrated into `src/app.js` in the correct order (rate limiter must be wired into the app before integration tests can validate its behavior).

## References

- Tasks file: `plan\tasks\tasks-tier-6-error-handling-hardening.json`
- Tier document: `plan\tiers\tier-6-error-handling-hardening.md`
