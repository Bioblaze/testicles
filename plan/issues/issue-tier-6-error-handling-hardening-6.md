TITLE:
Create error handler unit tests in test/middleware/errorHandler.test.js

BODY:
## Context

This task is part of **Tier 6: Error Handling, Logging & API Hardening**, which adds centralized error handling, structured logging, rate limiting, and security headers to make the API production-ready and resilient.

The centralized error handler middleware (`src/middleware/errorHandler.js`, implemented in #165) is a critical piece of the API — it translates application errors into safe, consistent HTTP responses and prevents internal details from leaking to clients. This task adds 6 focused unit tests that invoke the error handler directly with mock `req`, `res`, and `next` objects, verifying correct status codes, response bodies, and ensuring no information leakage for every error category the handler supports.

## Acceptance Criteria

- [ ] `test/middleware/errorHandler.test.js` is created with 6 passing unit tests.
- [ ] Test 1: `BookNotFoundError` maps to HTTP `404` with body `{ error: "Book not found" }`.
- [ ] Test 2: `BookUnavailableError` maps to HTTP `409` with body `{ error: "Book is already checked out" }`.
- [ ] Test 3: Unknown `Error('something broke')` returns HTTP `500` with body `{ error: "Internal server error" }`.
- [ ] Test 4: Unknown `Error('DB connection failed at host:5432')` returns HTTP `500` and the response body does **not** contain `"DB connection"` or `"5432"` — no internal details are leaked.
- [ ] Test 5: JSON parse error (object with `type: 'entity.parse.failed'`) returns HTTP `400` with body `{ error: "Malformed JSON in request body" }`.
- [ ] Test 6: All error responses have a consistent shape — the body always contains an `error` key with a string value, verified across multiple error types (`BookNotFoundError`, `BookUnavailableError`, unknown `Error`, and JSON parse error).
- [ ] Tests invoke the error handler directly (unit-level isolation) — no HTTP server or `supertest` required.
- [ ] All 6 tests pass when running `npm test`.
- [ ] All prior tier tests continue to pass.

## Implementation Notes

### Test setup

Create mock `req`, `res`, and `next` objects for each test:

```javascript
const errorHandler = require('../../src/middleware/errorHandler');
const { BookNotFoundError, BookUnavailableError } = require('../../src/errors');

// Mock res with chainable .status().json()
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const mockReq = {};
const mockNext = jest.fn();
```

### Test cases

| # | Test Case | Input Error | Expected Status | Expected Body |
|---|-----------|-------------|-----------------|---------------|
| 1 | `BookNotFoundError` maps to 404 | `new BookNotFoundError()` | `404` | `{ error: "Book not found" }` |
| 2 | `BookUnavailableError` maps to 409 | `new BookUnavailableError("Book is already checked out")` | `409` | `{ error: "Book is already checked out" }` |
| 3 | Unknown `Error` returns generic 500 | `new Error("something broke")` | `500` | `{ error: "Internal server error" }` |
| 4 | Unknown error does NOT leak details | `new Error("DB connection failed at host:5432")` | `500` | Body does NOT contain `"DB connection"` or `"5432"` |
| 5 | JSON parse error returns 400 | `{ type: 'entity.parse.failed' }` | `400` | `{ error: "Malformed JSON in request body" }` |
| 6 | Consistent response shape | Various errors | Various | Body always has an `error` key with a string value |

### Test 4 — no-leak assertion

For the information leakage test, serialize the response body to a string and assert it does not contain the sensitive substrings:

```javascript
const body = JSON.stringify(res.json.mock.calls[0][0]);
expect(body).not.toContain('DB connection');
expect(body).not.toContain('5432');
```

### Test 5 — JSON parse error simulation

The JSON parse error from `express.json()` is not an `Error` instance with a constructor — simulate it by passing a plain object with the `type` property:

```javascript
const parseError = { type: 'entity.parse.failed' };
errorHandler(parseError, req, res, next);
```

### Test 6 — consistent shape verification

Iterate over several error types and verify each response body has `{ error: <string> }`:

```javascript
const errors = [
  new BookNotFoundError(),
  new BookUnavailableError('Book is already checked out'),
  new Error('unknown'),
  { type: 'entity.parse.failed' },
];

errors.forEach((err) => {
  const res = mockRes();
  errorHandler(err, mockReq, res, mockNext);
  const body = res.json.mock.calls[0][0];
  expect(body).toHaveProperty('error');
  expect(typeof body.error).toBe('string');
});
```

### Key considerations

- The error handler imports `../logger` which is set to `silent` level in the test environment (`NODE_ENV=test`), so no log output will pollute test results.
- Tests should not require a running server or database — they exercise the middleware function directly.
- The mock `res` must support method chaining (`res.status(n).json(obj)`) since the error handler uses this pattern.

## Dependencies

- #165 — Centralized error handler middleware (`src/middleware/errorHandler.js`) must be implemented before these tests can validate its behavior.

## References

- Tasks file: `plan\tasks\tasks-tier-6-error-handling-hardening.json`
- Tier document: `plan\tiers\tier-6-error-handling-hardening.md`
