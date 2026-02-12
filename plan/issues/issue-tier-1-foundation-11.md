TITLE:
Write integration tests for health endpoint and 404 handling (test/health.test.js)

BODY:
## Context

As part of [Tier 1: Foundation & Continuous Integration](plan/tiers/tier-1-foundation.md), we need to create the first integration test suite for the project. This test file validates that the Express application factory (`src/app.js`) correctly serves the health-check endpoint and returns proper 404 responses for unknown routes.

These tests use `supertest` to make HTTP requests directly against the Express app instance without starting a real server. This approach avoids port conflicts and enables parallel test execution. The test suite is the final verification step before wiring up the CI pipeline, proving that the app boots correctly and the full test infrastructure (Jest + supertest) works end-to-end.

## Acceptance Criteria

- [ ] `test/health.test.js` exists and contains three test cases.
- [ ] **Test 1**: `GET /health` returns HTTP 200 with JSON body `{ "status": "ok" }`.
- [ ] **Test 2**: `GET /health` response includes a `Content-Type` header matching `application/json`.
- [ ] **Test 3**: `GET /nonexistent` returns HTTP 404 with JSON body `{ "error": "Not found" }`.
- [ ] `npm test` passes locally with all 3 test cases green.
- [ ] Jest coverage report is generated and meets the 80% threshold on all four metrics (statements, branches, functions, lines).

## Implementation Notes

Create `test/health.test.js` with the following structure:

```javascript
const request = require('supertest');
const app = require('../src/app');

describe('GET /health', () => {
  it('returns 200 with { status: "ok" }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns application/json content type', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

describe('Unknown routes', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});
```

### Key implementation details

- **No server startup required** — `supertest` accepts the Express app instance directly and binds it to an ephemeral port internally. The test imports `src/app.js` (the factory), not `src/server.js` (the production entry point).
- **Async/await pattern** — Each test case uses `async/await` with `supertest` for clean, readable assertion chains.
- **`describe` grouping** — Tests are organized into two `describe` blocks: one for the health endpoint behavior and one for unknown route handling. This produces clear, structured test output.
- **Content-Type assertion** — Uses `.toMatch(/application\/json/)` rather than an exact string comparison to account for Express appending charset information (e.g., `application/json; charset=utf-8`).

## Dependencies

- #106 — Jest and supertest must be installed as dev dependencies.
- #111 — The Express application factory (`src/app.js`) must exist with the health route mounted and the 404 catch-all middleware in place.
- #113 — Jest configuration must be in place so that `npm test` discovers tests in the `test/` directory and enforces coverage thresholds.

## References

- Tasks file: `plan/tasks/tasks-tier-1-foundation.json`
- Tier document: `plan/tiers/tier-1-foundation.md`
