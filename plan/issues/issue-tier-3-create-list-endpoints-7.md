TITLE:
Write integration tests for POST /books (test/routes/books.create.test.js)

BODY:
## Context

Tier 3 introduces the `POST /books` and `GET /books` endpoints for the library management API. With the route, validation middleware, and database wiring now in place (#138), we need thorough integration tests to verify the create-book endpoint behaves correctly for valid requests, validation failures, and conflict scenarios.

These tests will live in `test/routes/books.create.test.js`, use `supertest` to make HTTP requests against the Express app, and run against an in-memory SQLite database (`NODE_ENV=test`).

## Acceptance Criteria

- [ ] `test/routes/books.create.test.js` exists and is runnable via `npm test`.
- [ ] A reusable `validBook` fixture is defined with all required fields (`title`, `author`, `isbn`, `published_year`).
- [ ] **Test 1 — Valid payload creates a book**: `POST /books` with all valid fields returns `201`. Response body contains all submitted fields, a UUID `id`, `status: "available"`, and both `created_at` and `updated_at` timestamps.
- [ ] **Test 2 — Missing `title` returns validation error**: `POST /books` without `title` returns `400` with an `errors` array containing an entry where `field` is `"title"`.
- [ ] **Test 3 — Missing `author` returns validation error**: `POST /books` without `author` returns `400` with an `errors` array containing an entry where `field` is `"author"`.
- [ ] **Test 4 — Invalid ISBN format returns validation error**: `POST /books` with `isbn: "not-an-isbn"` returns `400` with an error referencing the `isbn` field.
- [ ] **Test 5 — `published_year` below 1000 returns error**: `POST /books` with `published_year: 999` returns `400` with an error referencing `published_year`.
- [ ] **Test 6 — `published_year` in the future returns error**: `POST /books` with `published_year: 9999` returns `400` with an error referencing `published_year`.
- [ ] **Test 7 — Empty body returns all field errors**: `POST /books` with `{}` returns `400` with `errors` array containing entries for all four required fields (`title`, `author`, `isbn`, `published_year`).
- [ ] **Test 8 — Duplicate ISBN returns conflict**: Creating a book then sending `POST /books` with the same ISBN returns `409` with `{ error: "A book with this ISBN already exists" }`.
- [ ] **Test 9 — Response includes expected default fields**: `POST /books` with valid data returns `201` with `id`, `created_at`, `updated_at`, `status: "available"`, and `checked_out_at: null`.
- [ ] All 9 test cases pass.
- [ ] All existing Tier 1 and Tier 2 tests continue to pass.

## Implementation Notes

- Import `supertest` and the `app` instance from `src/app.js`.
- The app factory should use an in-memory SQLite database (`:memory:`) when `NODE_ENV=test`.
- Define a `validBook` fixture object at the top of the test file for reuse across test cases. Example:
  ```js
  const validBook = {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '978-0-7432-7356-5',
    published_year: 1925,
  };
  ```
- For validation error tests (tests 2–7), spread `validBook` and override/delete specific fields.
- For the duplicate ISBN test (test 8), send two `POST /books` requests with the same payload — the second should return `409`.
- UUID validation for `id` can use a regex like `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`.
- Verify `created_at` and `updated_at` are valid ISO 8601 date strings.

## Dependencies

- #138 — Modify `src/app.js` to initialize database and mount book routes

## References

- Tasks file: `plan\tasks\tasks-tier-3-create-list-endpoints.json`
- Tier document: `plan\tiers\tier-3-create-list-endpoints.md`
