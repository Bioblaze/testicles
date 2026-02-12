TITLE:
Add GET /books/:id route with UUID validation in src/routes/books.js

BODY:
## Context

This is the first task in Tier 4 (View Book Endpoint) for the `book-api` project. The `GET /books/:id` endpoint allows clients to retrieve a single book by its UUID. Before the handler logic, integration tests, or any downstream tasks can be implemented, the route definition itself must exist with proper path-parameter validation wired into the middleware chain. This task adds the `GET /:id` route to the existing books router in `src/routes/books.js`, using `express-validator`'s `param()` chain to reject malformed IDs at the middleware level — before they ever reach the database. The shared `validate` middleware (already created in Tier 3) handles returning a structured `400` response when validation fails.

## What needs to happen

1. In `src/routes/books.js`, add a new `GET /:id` route on the existing books router.
2. The middleware chain for this route must include, in order:
   - `param('id').isUUID(4).withMessage('ID must be a valid UUID v4')` — validates the `:id` path parameter is a properly formatted UUID v4.
   - `validate` — the shared validation error handler middleware imported from `src/middleware/validate.js`. Returns `400` with structured errors (`{ errors: [{ field, message }] }`) if validation fails.
3. Provide a placeholder or minimal handler function (the full handler logic is implemented in a subsequent task).
4. The route **must** be defined after the existing `GET /` (list) route to prevent Express from matching `:id` as a literal path segment for other routes.

## Acceptance Criteria

- [ ] `GET /:id` route is defined on the books router in `src/routes/books.js`.
- [ ] The route uses `param('id').isUUID(4).withMessage('ID must be a valid UUID v4')` as the first middleware in the chain.
- [ ] The shared `validate` middleware from `src/middleware/validate.js` is the second middleware in the chain.
- [ ] The route is defined after the existing `GET /` (list) route.
- [ ] A request to `GET /books/not-a-uuid` returns `400` with `{ errors: [{ field: "id", message: "ID must be a valid UUID v4" }] }`.
- [ ] A request to `GET /books/12345` returns `400` with a structured validation error.
- [ ] All prior tier tests (Tier 1, Tier 2, Tier 3) continue to pass.

## Implementation Notes

- Import `param` from `express-validator` at the top of `src/routes/books.js` (if not already imported).
- Import the `validate` middleware from `src/middleware/validate.js` (if not already imported).
- UUID validation at the middleware level prevents unnecessary database lookups for obviously invalid IDs.
- The handler function will be fully implemented in the next task; this task focuses solely on wiring the route and its validation middleware.
- Route ordering matters in Express — parameterized routes like `/:id` should come after static routes like `/` to avoid conflicts.

## Dependencies

None — this is the first task in Tier 4 and has no dependency on other Tier 4 tasks.

## References

- Tasks file: `plan/tasks/tasks-tier-4-view-endpoint.json`
- Tier document: `plan/tiers/tier-4-view-endpoint.md`
