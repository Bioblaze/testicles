TITLE:
Implement GET /books route with pagination in src/routes/books.js

BODY:
## Context

This issue adds the `GET /books` endpoint to the existing Express router in `src/routes/books.js`. The route provides paginated listing of all books, with optional `page` and `limit` query parameters that silently fall back to sensible defaults when missing or invalid. This is part of Tier 3 (Create Book & List Books Endpoints), which wires the first RESTful endpoints through the Express router to the Book model.

The `POST /books` route already exists on this router (#136). This issue adds the companion read endpoint on the same path.

## Implementation Notes

### Middleware Chain

Add `GET /` to the existing router with the following middleware:

1. `query('page').optional().isInt({ min: 1 }).toInt()`
2. `query('limit').optional().isInt({ min: 1, max: 100 }).toInt()`
3. Handler function

**Do not** use the `validate` middleware on this route. Invalid query parameter values should silently fall back to defaults rather than returning a 400 error.

### Handler Logic

1. Read `page` and `limit` from `req.query`.
2. Apply defaults if the values are missing or failed validation (i.e., not valid integers):
   - `page` defaults to `1`
   - `limit` defaults to `20`
3. Compute `offset = (page - 1) * limit`.
4. Call `book.findAll(req.app.locals.db, { limit, offset })` to retrieve the paginated book list and total count.
5. Respond with `200 OK` and body:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

### Query Parameter Handling

| Parameter | Default | Rules |
|-----------|---------|-------|
| `page`    | `1`     | Must be a positive integer. Invalid values (negative, zero, non-numeric) silently fall back to `1`. |
| `limit`   | `20`    | Must be a positive integer, capped at `100`. Invalid values silently fall back to `20`. |

### Pagination Formula

```
offset = (page - 1) * limit
```

## Acceptance Criteria

- [ ] `GET /books` is defined on the existing router in `src/routes/books.js`.
- [ ] `query('page')` uses optional validation with `isInt({ min: 1 })` and `toInt()`.
- [ ] `query('limit')` uses optional validation with `isInt({ min: 1, max: 100 })` and `toInt()`.
- [ ] The `validate` middleware is **not** applied to this route.
- [ ] Missing or invalid `page` silently defaults to `1`.
- [ ] Missing or invalid `limit` silently defaults to `20`.
- [ ] `limit` is capped at `100`.
- [ ] The handler computes `offset = (page - 1) * limit` and calls `book.findAll(req.app.locals.db, { limit, offset })`.
- [ ] Response status is `200` with body `{ data: books, pagination: { page, limit, total } }`.
- [ ] All existing tests continue to pass.

## Dependencies

- #136 — Implement POST /books route (must exist on the router before adding GET)

## References

- Tasks file: `plan\tasks\tasks-tier-3-create-list-endpoints.json`
- Tier document: `plan\tiers\tier-3-create-list-endpoints.md`
