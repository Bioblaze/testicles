TITLE:
Create checkout history model unit tests in test/models/checkoutHistory.test.js

BODY:
## Context

The checkout history data-access model (`src/models/checkoutHistory.js`) and the updated checkout service (`src/services/checkout.js`) now record `checked_out` and `returned` events into the `checkout_history` table as part of Tier 7 (API Documentation & Developer Experience). These unit tests validate that history entries are correctly created during checkout/return operations and that the `findByBookId` query method behaves as specified — including reverse chronological ordering, pagination with `limit`/`offset`, and empty-result handling.

This is part of the broader Tier 7 effort to add audit visibility into checkout/return events via a `GET /books/:id/history` endpoint, backed by the `checkout_history` table.

## Acceptance Criteria

- [ ] `test/models/checkoutHistory.test.js` exists with 5 unit tests.
- [ ] Each test uses a fresh in-memory SQLite database with all migrations applied (including `002_create_checkout_history.sql`) and a seeded book record.
- [ ] **Test 1 — History entry is created on checkout**: Seed a book, call `checkoutBook(db, id)`, assert the `checkout_history` table has exactly 1 row with `action: 'checked_out'`.
- [ ] **Test 2 — History entry is created on return**: Seed a book, check it out, call `returnBook(db, id)`, assert the table has 2 rows and the latest row has `action: 'returned'`.
- [ ] **Test 3 — `findByBookId` returns entries in reverse chronological order**: Seed a book, check it out, return it, call `findByBookId(db, bookId, {})`, assert the first entry has `action: 'returned'` and the second has `action: 'checked_out'`.
- [ ] **Test 4 — `findByBookId` respects pagination**: Seed a book, perform 5 checkout/return cycles (10 total events), call `findByBookId(db, bookId, { limit: 3, offset: 0 })`, assert exactly 3 entries are returned and `total` is 10.
- [ ] **Test 5 — `findByBookId` returns empty array for book with no history**: Seed a book (never checked out), call `findByBookId(db, bookId, {})`, assert the result is `{ entries: [], total: 0 }`.
- [ ] All 5 tests pass when running `npm test`.
- [ ] All prior tier tests continue to pass.

## Implementation Notes

### Test Setup (per test)

1. Create a fresh in-memory SQLite database.
2. Run all migrations (including `001_create_books.sql` and `002_create_checkout_history.sql`).
3. Seed a book record into the `books` table with a known UUID, valid ISBN, and `status: 'available'`.

### Key Imports

- `checkoutBook` and `returnBook` from `src/services/checkout.js` — these now atomically insert history entries within their transactions.
- `findByBookId` from `src/models/checkoutHistory.js` — the query method under test for tests 3–5.
- Database helpers for creating the in-memory DB and running migrations.

### Notes

- Tests 1 and 2 verify history side-effects by directly querying the `checkout_history` table (e.g., `SELECT * FROM checkout_history WHERE book_id = ?`) rather than going through the model's read methods, ensuring the raw data is correct.
- Tests 3–5 exercise `findByBookId` and validate its return shape (`{ entries, total }`), ordering (newest first via `ORDER BY timestamp DESC`), and pagination (`limit`/`offset`).
- For test 4, a small delay or explicit timestamp ordering may be needed between checkout/return cycles to ensure deterministic ordering.

## Dependencies

- #175 — Modify checkout service to record history entries atomically within transactions

## References

- Tasks file: `plan\tasks\tasks-tier-7-documentation-history.json`
- Tier document: `plan\tiers\tier-7-documentation-history.md`
