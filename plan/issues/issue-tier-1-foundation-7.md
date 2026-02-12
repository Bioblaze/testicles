TITLE:
Implement health check route module (src/routes/health.js)

BODY:
## Context

This is part of **Tier 1: Foundation & Continuous Integration**, which establishes the Node.js project skeleton, installs core dependencies, configures the test runner, and wires a CI pipeline — proving the full build-test-deploy loop works end-to-end before any business logic is introduced.

The health check route is the first Express route module in the project. It provides a minimal `GET /health` endpoint that returns a `200` status with a JSON body of `{ "status": "ok" }`. This endpoint serves as the smoke-test surface for CI: if it responds, the Express application is booting correctly.

This route module will be mounted by the Express application factory (`src/app.js`, a downstream task) at the root path, making the full URL `GET /health`. The route is intentionally simple — its purpose is to validate the routing and middleware pipeline, not to implement business logic.

## Implementation Notes

Create `src/routes/health.js` with the following structure:

```javascript
const { Router } = require('express');

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = router;
```

### Steps

1. Create the file `src/routes/health.js`.
2. Import `Router` from `express`.
3. Create a new `Router` instance.
4. Define a `GET /health` route handler that responds with status `200` and JSON body `{ "status": "ok" }`.
5. Export the router as the module's default export (`module.exports`).

### Notes

- Use `res.json()` which automatically sets the `Content-Type` header to `application/json`.
- The router is a standalone module — it does **not** import or configure the Express app. It will be mounted by `src/app.js` in a subsequent task.
- The route path `/health` is defined on the router itself. When mounted at the root path in `app.js` (via `app.use(healthRouter)`), the full URL becomes `GET /health`.
- No middleware is needed on this route beyond what the parent app provides (e.g., `express.json()`).
- This file will be covered by integration tests in `test/health.test.js` (a downstream task) using `supertest`.

## Acceptance Criteria

- [ ] `src/routes/health.js` exists and is a valid Node.js module
- [ ] The module creates an Express `Router` instance
- [ ] The router defines a `GET /health` route
- [ ] `GET /health` responds with HTTP status `200`
- [ ] `GET /health` responds with JSON body `{ "status": "ok" }`
- [ ] `Content-Type` response header is `application/json`
- [ ] The router is exported via `module.exports`
- [ ] The module does not call `app.listen()` or create its own Express app instance

## Dependencies

- #105 — Install production dependencies (express, dotenv): `express` must be installed before it can be imported.
- #109 — Create project directory structure: the `src/routes/` directory must exist before the file can be created.

## References

- Tasks file: `plan/tasks/tasks-tier-1-foundation.json`
- Tier document: `plan/tiers/tier-1-foundation.md`
