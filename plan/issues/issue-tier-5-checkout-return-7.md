TITLE:
Add returnBook unit tests and full lifecycle test to test/services/checkout.test.js

BODY:
## Context

The `checkoutBook` unit tests were added in #158. The `returnBook` function was implemented in #155. This issue covers the remaining unit tests for `returnBook` (tests 5–8) and the full create-checkout-return-checkout lifecycle test (test 9) in `test/services/checkout.test.js`.

These tests validate the return-path business logic at the service layer: correct state transitions, timestamp clearing, and proper error handling for missing and already-available books. The lifecycle test confirms the complete state machine round-trip works end-to-end at the service level.

## Acceptance Criteria

- [ ] Test 5: `returnBook` transitions a `checked_out` book to `available` — seed and checkout a book, then return it; assert the returned book has `status: 'available'`.
- [ ] Test 6: `returnBook` clears `checked_out_at` to `null` — after returning a checked-out book, assert `checked_out_at` is `null`.
- [ ] Test 7: `returnBook` throws `BookNotFoundError` when called with a non-existent UUID.
- [ ] Test 8: `returnBook` throws `BookUnavailableError` with message `'Book is not currently checked out'` when called on a book that is already `available`.
- [ ] Test 9: Full lifecycle — create a book (available) → checkout (checked_out) → return (available) → checkout again (checked_out); all operations succeed and the final status is `'checked_out'`.
- [ ] All 9 service unit tests in `test/services/checkout.test.js` pass.
- [ ] All prior tier tests continue to pass.

## Implementation Notes

- Tests are added to the existing `test/services/checkout.test.js` file (created in #158), not a new file.
- Reuse the existing `beforeEach` setup: fresh in-memory `better-sqlite3` database, migrations run, and a seeded book with `status: 'available'`.
- For tests 5 and 6, first call `checkoutBook(db, id)` to put the book into `checked_out` state before calling `returnBook(db, id)`.
- For test 7, use a random valid-format UUID that does not exist in the database.
- For test 8, call `returnBook(db, id)` directly on the seeded available book without checking it out first.
- For the lifecycle test (9), chain: `checkoutBook` → `returnBook` → `checkoutBook` on the same book ID and assert each intermediate and final state.
- Import `returnBook` from `src/services/checkout.js` and error classes from `src/errors.js`.

## Dependencies

- #155 — `returnBook` function implementation in `src/services/checkout.js`
- #158 — Test file creation and `checkoutBook` unit tests

## References

- Tasks file: `plan/tasks/tasks-tier-5-checkout-return.json`
- Tier document: `plan/tiers/tier-5-checkout-return.md`
