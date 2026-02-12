TITLE:
Create history route integration tests in test/routes/books.history.test.js

BODY:
## Context

The `GET /books/:id/history` endpoint has been implemented in `src/routes/books.js` as part of Tier 7 (API Documentation & Developer Experience), providing paginated, reverse-chronological audit visibility into checkout/return events for a given book. The checkout service now atomically records history entries within its transactions, and the Swagger UI and JSON spec endpoints are mounted in `src/app.js`.

These 6 integration tests use `supertest` to exercise the full HTTP request/response cycle for the history endpoint — verifying correct data retrieval, pagination behavior, error handling for invalid or non-existent IDs, reverse chronological ordering, and empty-history edge cases. Together they ensure the route, validation middleware, controller logic, and data-access layer work correctly end-to-end.

## Acceptance Criteria

- [ ] `test/routes/books.history.test.js` exists with 6 integration tests using `supertest`.
- [ ] **Test 1 — Returns checkout/return events for a book**: Seed a book, check it out, return it, send `GET /books/:id/history`, expect `200` with a `data` array containing exactly 2 entries.
- [ ] **Test 2 — Returns 404 for non-existent book**: Send `GET /books/:nonexistentUuid/history` (valid UUID format but no matching book), expect `404` with `{ error: 'Book not found' }`.
- [ ] **Test 3 — Returns 400 for malformed UUID**: Send `GET /books/not-a-uuid/history`, expect `400` with a validation error for the `id` field.
- [ ] **Test 4 — Pagination query params work**: Seed a book, perform multiple checkout/return cycles, send `GET /books/:id/history?page=1&limit=2`, expect `200` with `data` containing exactly 2 entries and `pagination.total` reflecting the total number of events.
- [ ] **Test 5 — History reflects full checkout-return cycle**: Seed a book, check it out, return it, expect the first entry in `data` to have `action: 'returned'` and the second to have `action: 'checked_out'` (reverse chronological order).
- [ ] **Test 6 — Empty history for book never checked out**: Seed a book (never checked out), send `GET /books/:id/history`, expect `200` with `{ data: [], pagination: { page: 1, limit: 20, total: 0 } }`.
- [ ] All 6 tests pass when running `npm test`.
- [ ] All prior tier tests continue to pass.

## Implementation Notes

### Test Setup

1. Import `supertest` and the Express `app` from `src/app.js`.
2. Before each test (or in a shared setup), initialize a fresh in-memory SQLite database with all migrations applied (including `001_create_books.sql` and `002_create_checkout_history.sql`).
3. Seed a book record with a known UUID, valid ISBN, `status: 'available'`, and required fields (`title`, `author`, `published_year`).

### Test Details

| # | Test Case | Setup | Request | Expected Status | Expected Body |
|---|---|---|---|---|---|
| 1 | Returns checkout/return events | Seed book, checkout, return | `GET /books/:id/history` | `200` | `data` array with 2 entries |
| 2 | 404 for non-existent book | None | `GET /books/:nonexistentUuid/history` | `404` | `{ error: "Book not found" }` |
| 3 | 400 for malformed UUID | None | `GET /books/not-a-uuid/history` | `400` | Validation error for `id` |
| 4 | Pagination works | Seed book, multiple checkout/return cycles | `GET /books/:id/history?page=1&limit=2` | `200` | `data` has 2 entries, `pagination.total` reflects total |
| 5 | Reverse chronological order | Seed book, checkout, return | `GET /books/:id/history` | `200` | First entry is `'returned'`, second is `'checked_out'` |
| 6 | Empty history | Seed book (never checked out) | `GET /books/:id/history` | `200` | `{ data: [], pagination: { page: 1, limit: 20, total: 0 } }` |

### Key Assertions

- For test 2, use a syntactically valid UUID v4 that does not correspond to any seeded book (e.g., `00000000-0000-4000-a000-000000000000`).
- For test 3, use a clearly malformed UUID string like `not-a-uuid` to trigger the `param('id').isUUID(4)` validation.
- For test 4, perform at least 3 checkout/return cycles (6+ events) so that `limit=2` returns a subset and `pagination.total` is greater than 2.
- For test 5, verify the `action` field values and their order — the most recent event (`returned`) should appear first due to `ORDER BY timestamp DESC`.
- For test 6, verify the full pagination shape including `page`, `limit`, and `total` fields with their expected default/zero values.

### Notes

- Tests should perform checkout and return operations via `supertest` HTTP calls (`POST /books/:id/checkout` and `POST /books/:id/return`) rather than calling service functions directly, ensuring true integration-level coverage.
- Each test should be isolated with its own database state to prevent cross-test contamination.

## Dependencies

- #175 — Modify checkout service to record history entries atomically within transactions
- #177 — Add GET /books/:id/history route handler to src/routes/books.js
- #179 — Integrate Swagger UI and JSON spec endpoint into src/app.js

## References

- Tasks file: `plan\tasks\tasks-tier-7-documentation-history.json`
- Tier document: `plan\tiers\tier-7-documentation-history.md`
