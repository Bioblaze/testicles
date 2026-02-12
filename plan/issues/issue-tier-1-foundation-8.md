TITLE:
Implement Express application factory (`src/app.js`)

BODY:
## Context

The `book-api` project uses a **factory pattern** to separate the Express application from the server entry point. `src/app.js` is the central module that assembles middleware, routes, and error handling into a single Express app instance and exports it — **without** calling `.listen()`.

This separation is critical because it allows `supertest` to bind the app to an ephemeral port during integration tests, avoiding port conflicts and enabling parallel test execution. The production entry point (`src/server.js`, a later task) will import this module and call `.listen()`.

This task builds on #110, which provides the health check route module at `src/routes/health.js`.

## Acceptance Criteria

- [ ] `src/app.js` exists and exports an Express application instance.
- [ ] `express.json()` middleware is mounted for JSON body parsing.
- [ ] The health route module (`src/routes/health.js`) is mounted at the root path (`/`), making `GET /health` available.
- [ ] A catch-all middleware is registered **after** all routes that returns HTTP `404` with the JSON body `{ "error": "Not found" }` for any unmatched route.
- [ ] The module does **not** call `app.listen()` — the app is exported as a configurable instance.
- [ ] `GET /health` responds with `200` and `{ "status": "ok" }` when tested via `supertest`.
- [ ] `GET /nonexistent` (or any undefined route) responds with `404` and `{ "error": "Not found" }`.

## Implementation Notes

1. **Import Express** and create a new application instance via `express()`.
2. **Mount `express.json()`** as the first middleware to enable JSON request body parsing on all routes.
3. **Mount the health router** imported from `./routes/health.js` at the root path (`'/'`).
4. **Add a catch-all 404 middleware** at the end of the middleware stack. This should be a standard Express middleware function `(req, res, next)` that calls `res.status(404).json({ error: 'Not found' })`.
5. **Export** the app instance via `module.exports = app`.

### Example skeleton

```js
const express = require('express');
const healthRouter = require('./routes/health');

const app = express();

app.use(express.json());
app.use('/', healthRouter);

app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = app;
```

### Why no `.listen()`?

Keeping `.listen()` out of this module means any consumer — tests, CLI tools, or the production server — can import the fully-configured app and bind it however they need. This is standard practice for Express apps tested with `supertest`.

## Dependencies

- #110 — Health check route module (`src/routes/health.js`) must exist before this module can import it.

## References

- Tasks file: `plan\tasks\tasks-tier-1-foundation.json`
- Tier document: `plan\tiers\tier-1-foundation.md`
