TITLE:
Create checkoutHistory data-access model in src/models/checkoutHistory.js

BODY:
## Context

As part of **Tier 7 — API Documentation & Developer Experience**, the project needs a data-access layer for the `checkout_history` table to support audit visibility into checkout/return events. The `checkout_history` table (created in #173) stores a log of every checkout and return action performed on a book. This model provides the application-level interface for inserting and querying those records.

The `checkoutHistory` model is a prerequisite for modifying the checkout service to record history atomically and for the upcoming `GET /books/:id/history` endpoint.

## Acceptance Criteria

- [ ] `src/models/checkoutHistory.js` exists and exports an object with `create` and `findByBookId` methods.
- [ ] `create(db, { bookId, action })` generates a UUID v4 for the `id` field.
- [ ] `create` sets `timestamp` to the current ISO-8601 string via `new Date().toISOString()`.
- [ ] `create` inserts a row into the `checkout_history` table with columns `id`, `book_id`, `action`, and `timestamp`.
- [ ] `create` returns the created history entry object (i.e., `{ id, book_id, action, timestamp }`).
- [ ] `create` accepts and works correctly with a transactional `db` handle so it can be called inside an existing `db.transaction()` in `src/services/checkout.js` to ensure atomicity with the book status update.
- [ ] `findByBookId(db, bookId, { limit, offset })` defaults `limit` to `20` and `offset` to `0` when not provided.
- [ ] `findByBookId` executes `SELECT * FROM checkout_history WHERE book_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?` to return entries in reverse chronological order (newest first).
- [ ] `findByBookId` executes a parallel count query `SELECT COUNT(*) AS total FROM checkout_history WHERE book_id = ?`.
- [ ] `findByBookId` returns `{ entries: HistoryEntry[], total: number }`.
- [ ] Returns `{ entries: [], total: 0 }` when no history exists for the given book.

## Implementation Notes

### File: `src/models/checkoutHistory.js`

Export a plain object with two methods:

#### `create(db, { bookId, action })`

```javascript
const { v4: uuidv4 } = require('uuid');

// Inside create:
const id = uuidv4();
const timestamp = new Date().toISOString();
db.prepare(
  'INSERT INTO checkout_history (id, book_id, action, timestamp) VALUES (?, ?, ?, ?)'
).run(id, bookId, action, timestamp);
return { id, book_id: bookId, action, timestamp };
```

**Important**: This method is designed to be called from within `src/services/checkout.js` inside the same `db.transaction()` as the book status update. The `db` parameter may be either the raw database handle or a transactional wrapper — the method must work with both to ensure atomicity.

#### `findByBookId(db, bookId, { limit, offset })`

```javascript
// Apply defaults
const _limit = limit ?? 20;
const _offset = offset ?? 0;

// Data query — reverse chronological order
const entries = db.prepare(
  'SELECT * FROM checkout_history WHERE book_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?'
).all(bookId, _limit, _offset);

// Count query
const { total } = db.prepare(
  'SELECT COUNT(*) AS total FROM checkout_history WHERE book_id = ?'
).get(bookId);

return { entries, total };
```

### Database Schema (for reference)

The `checkout_history` table (created by migration `002_create_checkout_history.sql` in #173):

| Column      | Type   | Constraints                        |
|-------------|--------|------------------------------------|
| `id`        | `TEXT` | Primary key (UUID v4)              |
| `book_id`   | `TEXT` | `NOT NULL`, FK → `books.id`       |
| `action`    | `TEXT` | `NOT NULL` (`"checked_out"` / `"returned"`) |
| `timestamp` | `TEXT` | `NOT NULL` (ISO-8601)              |

## Dependencies

- #173 — checkout_history database migration must exist before this model can operate on the table

## References

- Tasks file: `plan\tasks\tasks-tier-7-documentation-history.json`
- Tier document: `plan\tiers\tier-7-documentation-history.md`
