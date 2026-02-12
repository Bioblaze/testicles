TITLE:
Implement production server entry point (src/server.js)

BODY:
## Context

As part of **Tier 1: Foundation & Continuous Integration**, the project follows a factory pattern where `src/app.js` creates and exports the Express application without binding to a port. A separate production entry point is needed to wire environment configuration and start the HTTP server.

`src/server.js` is the production entry point referenced by `package.json`'s `main` field and the `npm start` script. It bridges environment variables (loaded via `dotenv`) with the Express app instance, binding it to a configurable port.

This file is intentionally **excluded from test coverage** (configured in `jest.config.js`) because it performs side effects (listening on a port) that are not suitable for unit/integration testing. The app factory in `src/app.js` is tested independently via `supertest`.

## Implementation Notes

- **Load environment variables**: `require('dotenv/config')` at the top of the file so `.env` values are available in `process.env` before any other module reads them.
- **Import the app**: `const app = require('./app');`
- **Read `PORT`**: `const PORT = process.env.PORT || 3000;` — defaults to `3000` if not set.
- **Start the server**: `app.listen(PORT, () => { ... })` — pass a callback that logs a startup message (e.g., `Server listening on port ${PORT}`) to stdout via `console.log`.
- Keep the file minimal — no business logic, no middleware registration. All of that belongs in `src/app.js`.

### Example implementation

```js
require('dotenv/config');
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

## Acceptance Criteria

- [ ] `src/server.js` exists and is the value of `main` in `package.json`.
- [ ] `dotenv/config` is loaded before importing the app so environment variables are available.
- [ ] `PORT` is read from `process.env` with a default of `3000`.
- [ ] `app.listen(PORT)` is called and a startup message is logged to stdout.
- [ ] `npm start` successfully boots the server and responds to requests (e.g., `GET /health` returns 200).
- [ ] `src/server.js` is excluded from Jest coverage (verified in `jest.config.js` `coveragePathIgnorePatterns`).

## Dependencies

- #105 — Install production dependencies (`express`, `dotenv`) must be completed so `require('dotenv/config')` resolves.
- #111 — Implement Express application factory (`src/app.js`) must exist so the app can be imported.

## References

- Tasks file: `plan\tasks\tasks-tier-1-foundation.json`
- Tier document: `plan\tiers\tier-1-foundation.md`
