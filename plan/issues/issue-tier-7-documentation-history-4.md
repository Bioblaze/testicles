TITLE:
Modify checkout service to record history entries atomically within transactions

BODY:
## Context

The checkout history model (`src/models/checkoutHistory.js`) introduced in #174 provides a `create` method for inserting audit records into the `checkout_history` table. Currently, `src/services/checkout.js` updates book status within `db.transaction()` blocks but does not record any history. This task wires the two together so that every checkout or return operation produces an auditable history entry **inside the same transaction**, guaranteeing that the book status change and its corresponding history row either commit together or roll back together.

This is a prerequisite for the upcoming `GET /books/:id/history` endpoint and the checkout history model unit tests, both of which depend on history entries being created during checkout/return flows.

## Acceptance Criteria

- [ ] `src/services/checkout.js` imports `checkoutHistory` from `../models/checkoutHistory`.
- [ ] `checkoutBook(db, id)` calls `checkoutHistory.create(db, { bookId: id, action: 'checked_out' })` **after** the existing `UPDATE` statement, **inside** the `db.transaction()` block.
- [ ] `returnBook(db, id)` calls `checkoutHistory.create(db, { bookId: id, action: 'returned' })` **after** the existing `UPDATE` statement, **inside** the `db.transaction()` block.
- [ ] If the history insert fails, the entire transaction (including the book status update) rolls back — no partial writes.
- [ ] If the book status update fails, no history entry is persisted.
- [ ] All prior tier tests continue to pass (no regressions).
- [ ] Checkout history provides a complete, ordered audit trail for every state change.

## Implementation Notes

### File to modify

**`src/services/checkout.js`**

### Changes

1. Add import at the top of the file:
   ```javascript
   const checkoutHistory = require('../models/checkoutHistory');
   ```

2. In `checkoutBook(db, id)` — inside the existing `db.transaction()` callback, immediately after the `UPDATE` statement that sets the book status:
   ```javascript
   checkoutHistory.create(db, { bookId: id, action: 'checked_out' });
   ```

3. In `returnBook(db, id)` — inside the existing `db.transaction()` callback, immediately after the `UPDATE` statement that sets the book status:
   ```javascript
   checkoutHistory.create(db, { bookId: id, action: 'returned' });
   ```

### Why inside the transaction?

Both calls to `checkoutHistory.create` must execute within the same `db.transaction()` scope as the book status `UPDATE`. SQLite transactions are connection-level: any statement executed on the same `db` handle inside the transaction callback participates in that transaction. This ensures atomicity — the history row and status change are committed or rolled back as a single unit.

### No new tests in this task

This task only modifies the service layer. Dedicated unit tests validating that history entries are created correctly are covered in a subsequent task. However, all existing tests must continue to pass after these changes.

## Dependencies

- #174 — Create checkoutHistory data-access model (provides `checkoutHistory.create`)

## References

- Tasks file: `plan\tasks\tasks-tier-7-documentation-history.json`
- Tier document: `plan\tiers\tier-7-documentation-history.md`
