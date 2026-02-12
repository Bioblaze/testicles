TITLE:
Write integration tests for GET /books (test/routes/books.list.test.js)

BODY:
## Context

Tier 3 introduces the `POST /books` and `GET /books` endpoints. This issue covers the integration test suite for the `GET /books` (list) endpoint, ensuring paginated listing behaves correctly under a variety of query-parameter scenarios.

The test file `test/routes/books.list.test.js` will use `supertest` against the Express app with an in-memory SQLite database (`NODE_ENV=test`). A seeding step will insert 25 books via the Book model's `create` method to exercise pagination logic.

## Acceptance Criteria

- [ ] `test/routes/books.list.test.js` is created and exports 8 test cases.
- [ ] **Test 1 — Empty database**: `GET /books` with no seeded data returns `200` with `{ data: [], pagination: { page: 1, limit: 20, total: 0 } }`.
- [ ] **Test 2 — Seeded books returned**: After seeding 25 books, `GET /books` returns `200` with `data` containing 20 items and `pagination.total` of 25.
- [ ] **Test 3 — Pagination defaults applied**: `GET /books` with no query parameters returns `pagination.page` of `1` and `pagination.limit` of `20`.
- [ ] **Test 4 — Custom page and limit**: `GET /books?page=2&limit=10` returns 10 items in `data` with `pagination.page` of `2`.
- [ ] **Test 5 — Limit capped at 100**: `GET /books?limit=200` returns `pagination.limit` of `100` (or falls back to default `20` if treated as invalid).
- [ ] **Test 6 — Response shape**: Response body contains `data` (array) and `pagination` (object with `page`, `limit`, `total` keys).
- [ ] **Test 7 — Invalid page falls back to default**: `GET /books?page=-1` returns `pagination.page` of `1`.
- [ ] **Test 8 — Invalid limit falls back to default**: `GET /books?limit=abc` returns `pagination.limit` of `20`.
- [ ] All 8 tests pass when running `npm test`.
- [ ] All existing Tier 1, Tier 2, and other Tier 3 tests continue to pass.

## Implementation Notes

- Use `supertest` to make HTTP requests against the app instance.
- Seed 25 books in a `beforeAll` or `beforeEach` block using the Book model's `create` method (not direct SQL or POST requests) to keep setup focused on the model layer.
- The first test case (empty database) should run in its own `describe` block **before** seeding, or use a separate app/database instance, to verify the empty-state response.
- The `GET /books` route does **not** use the `validate` middleware — invalid query parameters silently fall back to defaults (`page=1`, `limit=20`). Tests must assert this fallback behavior, not error responses.
- Each seeded book needs a unique ISBN; consider generating ISBNs programmatically (e.g., using a valid ISBN-13 pattern with an incrementing suffix and correct check digit, or a library).
- Pagination formula used by the endpoint: `offset = (page - 1) * limit`.

## Dependencies

- #138 — Modify `src/app.js` to initialize database and mount book routes (must be completed first so the app exposes `GET /books`).

## References

- Tasks file: `plan\tasks\tasks-tier-3-create-list-endpoints.json`
- Tier document: `plan\tiers\tier-3-create-list-endpoints.md`
