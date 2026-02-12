TITLE:
Implement Book model findById method

BODY:
## Context

As part of **Tier 2: Data Persistence & Book Model**, we are building out the Book data-access object (DAO) in `src/models/book.js`. The `create` method was implemented in #124 and established the module structure. This issue adds the `findById` method, which provides single-record lookup by primary key — a fundamental operation required by higher-level features such as the REST API detail endpoint and the checkout/return flows.

## Description

Add the `findById(db, id)` method to the existing `src/models/book.js` module.

**Behavior:**
- Accepts a `db` (better-sqlite3 database instance) and an `id` (string UUID) as arguments.
- Executes `SELECT * FROM books WHERE id = ?` using a prepared statement with the provided `id`.
- Returns the book row as a plain object if a match is found.
- Returns `null` if no row matches the given `id`.

**Method signature:**
```javascript
findById(db, id)
```

## Acceptance Criteria

- [ ] `findById` is exported as a method on the Book model object in `src/models/book.js`.
- [ ] Querying with an existing book's `id` returns the full book object with all columns (`id`, `title`, `author`, `isbn`, `published_year`, `status`, `checked_out_at`, `created_at`, `updated_at`).
- [ ] Querying with a non-existent `id` returns `null` (not `undefined`, not an empty object).
- [ ] The method uses a prepared statement for safe parameterized queries.
- [ ] All existing tests continue to pass (no regressions).

## Implementation Notes

- Use `better-sqlite3`'s `.get()` method on a prepared statement, which returns `undefined` when no row is found — normalize this to `null` before returning.
- The method should be concise (approximately 3–5 lines).
- Follow the same dependency-injection pattern established by `create`: the `db` instance is passed as the first argument.

**Example implementation:**
```javascript
findById(db, id) {
  const stmt = db.prepare('SELECT * FROM books WHERE id = ?');
  const book = stmt.get(id);
  return book || null;
}
```

## Dependencies

- #124 — Implement Book model create method (establishes `src/models/book.js` module and the `create` method)

## References

- Tasks file: `plan\tasks\tasks-tier-2-data-layer.json`
- Tier document: `plan\tiers\tier-2-data-layer.md`
