TITLE:
Add GET /books/:id/history route handler to src/routes/books.js

BODY:
## Context

As part of **Tier 7 — API Documentation & Developer Experience**, we need a `GET /books/:id/history` endpoint that provides audit visibility into checkout and return events for a given book. This route returns a paginated, reverse-chronological list of history entries so consumers can inspect the full lifecycle of any book in the system.

The `checkoutHistory` model (created in #174) already exposes `findByBookId(db, bookId, { limit, offset })`, which returns `{ entries, total }`. This task wires that model into a new route handler in `src/routes/books.js` with proper input validation and error handling.

## Acceptance Criteria

- [ ] `src/routes/books.js` imports the `checkoutHistory` model.
- [ ] A new `GET /:id/history` route is registered on the books router.
- [ ] Validation middleware is applied in order:
  - `param('id').isUUID(4).withMessage('ID must be a valid UUID v4')`
  - `query('page').optional().isInt({ min: 1 }).toInt()`
  - `query('limit').optional().isInt({ min: 1, max: 100 }).toInt()`
  - `validate` middleware
- [ ] A malformed UUID returns `400` with a validation error for the `id` field.
- [ ] A valid UUID for a non-existent book returns `404` with `{ error: 'Book not found' }`.
- [ ] A valid request returns `200` with `{ data: HistoryEntry[], pagination: { page, limit, total } }`.
- [ ] `page` defaults to `1` and `limit` defaults to `20` when not provided.
- [ ] Results are returned in reverse chronological order (newest first).
- [ ] All prior tier tests continue to pass.

## Implementation Notes

### Route definition

Add the following to `src/routes/books.js`:

```javascript
const checkoutHistory = require('../models/checkoutHistory');

router.get(
  '/:id/history',
  param('id').isUUID(4).withMessage('ID must be a valid UUID v4'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  validate,
  async (req, res) => { /* handler */ }
);
```

### Handler logic

1. Read `id` from `req.params.id`.
2. Verify the book exists by calling `book.findById(db, id)`.
3. If book is `null`, respond with `404` and `{ error: 'Book not found' }`.
4. Read `page` (default `1`) and `limit` (default `20`) from `req.query`.
5. Compute `offset = (page - 1) * limit`.
6. Call `checkoutHistory.findByBookId(db, id, { limit, offset })`.
7. Respond with `200` and `{ data: entries, pagination: { page, limit, total } }`.

### Response shape (200)

```json
{
  "data": [
    {
      "id": "a1b2c3d4-...",
      "book_id": "550e8400-...",
      "action": "returned",
      "timestamp": "2025-02-10T15:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### Error responses

| Condition | Status | Body |
|---|---|---|
| Malformed UUID | `400` | `{ errors: [{ field: "id", message: "ID must be a valid UUID v4" }] }` |
| Book not found | `404` | `{ error: "Book not found" }` |

## Dependencies

- #174 — `checkoutHistory` model must exist with the `findByBookId` method.

## References

- Tasks file: `plan\tasks\tasks-tier-7-documentation-history.json`
- Tier document: `plan\tiers\tier-7-documentation-history.md`
