TITLE:
Implement returnBook function in src/services/checkout.js

BODY:
## Context

This is part of **Tier 5: Checkout & Return System**, which implements the book checkout/return lifecycle with atomic database transactions and custom error handling.

The `returnBook` function is the core business logic for returning a checked-out book. It lives in `src/services/checkout.js` alongside the existing `checkoutBook` function, decoupled from HTTP concerns, and enforces the `checked_out → available` state transition using a `better-sqlite3` transaction for atomicity.

Together, `checkoutBook` and `returnBook` complete the book state machine:

```
  available ──── checkout ────→ checked_out
      ↑                              │
      └──────── return ──────────────┘
```

This function is a prerequisite for the return route (`POST /books/:id/return`), the `returnBook` unit tests, and the full lifecycle test.

## Acceptance Criteria

- [ ] `returnBook(db, id)` is implemented in `src/services/checkout.js`.
- [ ] All logic is wrapped in a `better-sqlite3` transaction via `db.transaction(...)` to ensure atomic read-then-write.
- [ ] SELECT the book by `id`; if no book found, throw `BookNotFoundError`.
- [ ] If `book.status !== 'checked_out'`, throw `BookUnavailableError('Book is not currently checked out')`.
- [ ] UPDATE the book setting `status = 'available'`, `checked_out_at = null`, and `updated_at = new Date().toISOString()`.
- [ ] SELECT and return the updated book row after the update.
- [ ] Both `checkoutBook` and `returnBook` are exported from the module (`module.exports = { checkoutBook, returnBook }`).
- [ ] Error classes (`BookNotFoundError`, `BookUnavailableError`) are imported from `../errors`.
- [ ] Only the `checked_out → available` transition is permitted; all other states are rejected with a `409` status code.

## Implementation Notes

### Function Signature

```javascript
function returnBook(db, id)
```

- `db` — a `better-sqlite3` database instance
- `id` — the UUID of the book to return

### Transaction Flow

1. Begin a `better-sqlite3` transaction (`db.transaction(...)`).
2. `SELECT * FROM books WHERE id = ?` — fetch the book.
3. If no row returned, throw `new BookNotFoundError()`.
4. If `book.status !== 'checked_out'`, throw `new BookUnavailableError('Book is not currently checked out')`.
5. Compute `now = new Date().toISOString()`.
6. `UPDATE books SET status = 'available', checked_out_at = null, updated_at = ? WHERE id = ?` — pass `now`, `id`.
7. `SELECT * FROM books WHERE id = ?` — re-fetch and return the updated row.
8. Transaction commits automatically on successful return (or rolls back on thrown error).

### Key Design Decisions

- **Transaction wrapping**: Prevents race conditions where concurrent return requests could conflict. The transaction ensures serialized access.
- **Re-SELECT after UPDATE**: Returns the actual persisted state rather than constructing the return value in application code, ensuring consistency.
- **Clearing `checked_out_at`**: Set to `null` on return to indicate the book is no longer held, distinguishing it from the `checked_out` state where a timestamp is present.
- **Decoupled from HTTP**: This is a pure service function — it throws typed errors that route handlers translate to HTTP status codes.

### File Location

- `src/services/checkout.js` (existing file — add `returnBook` alongside `checkoutBook`)

### Exports

After this change, the module exports must include both functions:

```javascript
module.exports = { checkoutBook, returnBook };
```

## Dependencies

- #154 — `checkoutBook` function in `src/services/checkout.js` (the file and initial function must exist before adding `returnBook`; also provides the pattern for transaction usage and error handling)

## References

- Tasks file: `plan\tasks\tasks-tier-5-checkout-return.json`
- Tier document: `plan\tiers\tier-5-checkout-return.md`
