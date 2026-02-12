TITLE:
Create test/routes/books.return.test.js with all 6 integration tests

BODY:
## Context

The `POST /books/:id/return` route was implemented in #157. This issue covers creating the integration test file `test/routes/books.return.test.js` with 6 tests that exercise the return endpoint through HTTP using `supertest` against the full Express app. These tests validate the complete request/response cycle including validation middleware, route handling, service logic, and database interactions for the return operation.

The tests cover the happy path (successful return of a checked-out book), all error branches (non-existent book, returning an already available book, malformed UUID), and response shape verification (correct `status` field value and `checked_out_at` being `null`).

## Acceptance Criteria

- [ ] Test 1: Successful return — seed a book via `POST /books`, check it out via `POST /books/:id/checkout`, then `POST /books/:id/return` returns `200` with the book having `status: 'available'`.
- [ ] Test 2: Return of a non-existent valid UUID returns `404` with `{ error: 'Book not found' }`.
- [ ] Test 3: Return of an already available book returns `409` with `{ error: 'Book is not currently checked out' }`.
- [ ] Test 4: Malformed UUID (e.g., `'not-a-uuid'`) returns `400` with `{ errors: [{ field: 'id', ... }] }`.
- [ ] Test 5: Response `status` field equals `'available'` after a successful return.
- [ ] Test 6: Response `checked_out_at` is `null` after a successful return.
- [ ] All 6 integration tests in `test/routes/books.return.test.js` pass.
- [ ] All prior tier tests continue to pass.

## Implementation Notes

- Create the new file `test/routes/books.return.test.js`.
- Use `supertest` with the app instance (e.g., `const request = require('supertest'); const app = require('../../src/app');`).
- Seed books via `POST /books` and check them out via `POST /books/:id/checkout` in setup as needed to ensure books are in the `checked_out` state before testing the return operation.
- For test 1, seed a book, check it out, then POST to `/books/:id/return` and assert `200` status with `status: 'available'` in the response body.
- For test 2, use a valid UUID v4 format that does not correspond to any seeded book (e.g., `'00000000-0000-4000-a000-000000000000'`).
- For test 3, seed a book (which defaults to `available` status) and attempt to return it without checking it out first.
- For test 4, POST to `/books/not-a-uuid/return` and assert a `400` response with an `errors` array containing an object with `field: 'id'`.
- For test 5, verify the response body's `status` property is exactly the string `'available'`.
- For test 6, assert that `body.checked_out_at` is strictly `null`.
- Follow the same test structure and patterns used in existing route integration tests in the project, particularly the parallel checkout tests in `test/routes/books.checkout.test.js`.

## Dependencies

- #157 — `POST /books/:id/return` route implementation in `src/routes/books.js`

## References

- Tasks file: `plan/tasks/tasks-tier-5-checkout-return.json`
- Tier document: `plan/tiers/tier-5-checkout-return.md`
