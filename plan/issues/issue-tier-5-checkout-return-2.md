TITLE:
Implement checkoutBook function in src/services/checkout.js

BODY:
## Context

This is part of **Tier 5: Checkout & Return System**, which implements the book checkout/return lifecycle with atomic database transactions and custom error handling.

The `checkoutBook` function is the core business logic for checking out a book. It lives in `src/services/checkout.js`, decoupled from HTTP concerns, and enforces the `available → checked_out` state transition using a `better-sqlite3` transaction for atomicity.

This function is a prerequisite for the checkout route (`POST /books/:id/checkout`) and the corresponding service unit tests.

## Acceptance Criteria

- [ ] Create `src/services/checkout.js` and export `checkoutBook(db, id)`.
- [ ] All logic is wrapped in a `better-sqlite3` transaction via `db.transaction(...)` to ensure atomic read-then-write.
- [ ] SELECT the book by `id`; if no book found, throw `BookNotFoundError`.
- [ ] If `book.status !== 'available'`, throw `BookUnavailableError('Book is already checked out')`.
- [ ] UPDATE the book setting `status = 'checked_out'`, `checked_out_at = new Date().toISOString()`, and `updated_at = new Date().toISOString()`.
- [ ] SELECT and return the updated book row after the update.
- [ ] Error classes (`BookNotFoundError`, `BookUnavailableError`) are imported from `../errors`.
- [ ] Only the `available → checked_out` transition is permitted; all other states are rejected.

## Implementation Notes

### Function Signature

```javascript
function checkoutBook(db, id)
```

- `db` — a `better-sqlite3` database instance
- `id` — the UUID of the book to check out

### Transaction Flow

1. Begin a `better-sqlite3` transaction (`db.transaction(...)`).
2. `SELECT * FROM books WHERE id = ?` — fetch the book.
3. If no row returned, throw `new BookNotFoundError()`.
4. If `book.status !== 'available'`, throw `new BookUnavailableError('Book is already checked out')`.
5. Compute `now = new Date().toISOString()`.
6. `UPDATE books SET status = 'checked_out', checked_out_at = ?, updated_at = ? WHERE id = ?` — pass `now`, `now`, `id`.
7. `SELECT * FROM books WHERE id = ?` — re-fetch and return the updated row.
8. Transaction commits automatically on successful return (or rolls back on thrown error).

### Key Design Decisions

- **Transaction wrapping**: Prevents race conditions where two concurrent checkout requests could both read `available` and both succeed. The transaction ensures serialized access.
- **Re-SELECT after UPDATE**: Returns the actual persisted state rather than constructing the return value in application code, ensuring consistency.
- **Decoupled from HTTP**: This is a pure service function — it throws typed errors that route handlers translate to HTTP status codes.

### File Location

- `src/services/checkout.js` (new file)

## Dependencies

- #153 — Custom error class hierarchy in `src/errors.js` (must exist before this function can import `BookNotFoundError` and `BookUnavailableError`)

## References

- Tasks file: `plan\tasks\tasks-tier-5-checkout-return.json`
- Tier document: `plan\tiers\tier-5-checkout-return.md`
