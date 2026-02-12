TITLE:
Create test/routes/books.checkout.test.js with all 6 integration tests

BODY:
## Context

The `POST /books/:id/checkout` route was implemented in #156. This issue covers creating the integration test file `test/routes/books.checkout.test.js` with 6 tests that exercise the checkout endpoint through HTTP using `supertest` against the full Express app. These tests validate the complete request/response cycle including validation middleware, route handling, service logic, and database interactions for the checkout operation.

The tests cover the happy path (successful checkout), all error branches (non-existent book, already checked-out book, malformed UUID), and response shape verification (correct `status` field value and valid `checked_out_at` timestamp).

## Acceptance Criteria

- [ ] Test 1: Successful checkout — seed a book via `POST /books`, then `POST /books/:id/checkout` returns `200` with the book having `status: 'checked_out'`.
- [ ] Test 2: Checkout of a non-existent valid UUID returns `404` with `{ error: 'Book not found' }`.
- [ ] Test 3: Checkout of an already checked-out book returns `409` with `{ error: 'Book is already checked out' }`.
- [ ] Test 4: Malformed UUID (e.g., `'not-a-uuid'`) returns `400` with `{ errors: [{ field: 'id', ... }] }`.
- [ ] Test 5: Response `status` field equals `'checked_out'` after a successful checkout.
- [ ] Test 6: Response `checked_out_at` is a valid parseable timestamp (not `null`) after a successful checkout.
- [ ] All 6 integration tests in `test/routes/books.checkout.test.js` pass.
- [ ] All prior tier tests continue to pass.

## Implementation Notes

- Create the new file `test/routes/books.checkout.test.js`.
- Use `supertest` with the app instance (e.g., `const request = require('supertest'); const app = require('../../src/app');`).
- Seed books via `POST /books` in a `beforeEach` hook or per-test setup to ensure a clean state for each test. Each seeded book should have valid `title` and `author` fields.
- For test 1, seed a book then POST to `/books/:id/checkout` and assert `200` status with `status: 'checked_out'` in the response body.
- For test 2, use a valid UUID v4 format that does not correspond to any seeded book (e.g., `'00000000-0000-4000-a000-000000000000'`).
- For test 3, seed a book, check it out once, then attempt a second checkout on the same book.
- For test 4, POST to `/books/not-a-uuid/checkout` and assert a `400` response with an `errors` array containing an object with `field: 'id'`.
- For test 5, verify the response body's `status` property is exactly the string `'checked_out'`.
- For test 6, assert that `new Date(body.checked_out_at)` is a valid date (not `NaN`) and that `body.checked_out_at` is not `null`.
- Follow the same test structure and patterns used in existing route integration tests in the project.

## Dependencies

- #156 — `POST /books/:id/checkout` route implementation in `src/routes/books.js`

## References

- Tasks file: `plan/tasks/tasks-tier-5-checkout-return.json`
- Tier document: `plan/tiers/tier-5-checkout-return.md`
