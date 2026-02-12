TITLE:
Implement Book model findAll method with pagination support

BODY:
## Context

The Book data-access object (`src/models/book.js`) currently exposes `create` and `findById` methods. To support listing books with pagination in the API layer, we need to add a `findAll` method that returns a page of books along with the total count for building pagination controls.

This is part of **Tier 2: Data Persistence & Book Model**, which introduces a SQLite-backed persistence layer with the Book DAO.

## Implementation Notes

Add the `findAll(db, { limit, offset })` method to `src/models/book.js`:

- **Parameters**: Accepts the `db` instance (dependency injection) and an options object with `limit` and `offset`.
- **Defaults**: `limit` defaults to `20`, `offset` defaults to `0`.
- **Paginated query**: Execute `SELECT * FROM books ORDER BY created_at DESC LIMIT ? OFFSET ?` with the resolved `limit` and `offset` values.
- **Total count query**: Execute `SELECT COUNT(*) AS total FROM books` alongside the paginated query to provide the total number of books in the table.
- **Return value**: `{ books: Book[], total: number }` — an array of book row objects and the integer total count.

Since `better-sqlite3` is synchronous, both queries can be run sequentially in the same call without async overhead. The method should follow the same dependency-injection pattern as the existing `create` and `findById` methods.

### Example signature

```javascript
function findAll(db, { limit = 20, offset = 0 } = {}) {
  const books = db.prepare('SELECT * FROM books ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM books').get();
  return { books, total };
}
```

## Acceptance Criteria

- [ ] `findAll` method is exported from `src/models/book.js`.
- [ ] `limit` defaults to `20` and `offset` defaults to `0` when not provided.
- [ ] Returns `{ books: [], total: 0 }` when the books table is empty.
- [ ] Returns the correct subset of books when `limit` and `offset` are specified.
- [ ] `total` always reflects the full count of books in the table, regardless of pagination.
- [ ] Books are ordered by `created_at DESC` (newest first).
- [ ] Existing `create` and `findById` methods remain unaffected.
- [ ] All existing tests continue to pass.

## Dependencies

- #124 — Implement Book model create method (establishes `src/models/book.js` and the base DAO structure)

## References

- Tasks file: `plan\tasks\tasks-tier-2-data-layer.json`
- Tier document: `plan\tiers\tier-2-data-layer.md`
