TITLE:
Implement Book model `update(db, id, fields)` method

BODY:
## Context

The Book data-access object (`src/models/book.js`) currently exposes `create`, `findById`, and `findAll` methods. The `update` method is the final CRUD operation needed to complete the Book model, enabling partial updates to book records in the SQLite database. This is part of the Tier 2 Data Persistence layer.

## Acceptance Criteria

- [ ] `src/models/book.js` exports an `update(db, id, fields)` method.
- [ ] `fields` accepts any subset of: `title`, `author`, `isbn`, `published_year`, `status`, `checked_out_at`.
- [ ] The `SET` clause is dynamically built from only the keys present in `fields` — unspecified fields remain unchanged.
- [ ] `updated_at` is always set to the current ISO-8601 timestamp (`new Date().toISOString()`), regardless of whether it is included in `fields`.
- [ ] The update is executed using a prepared statement with parameterized values.
- [ ] Returns `null` if no rows are affected (i.e., the book with the given `id` does not exist).
- [ ] If rows are affected, re-selects the row by `id` and returns the full updated book object.
- [ ] Catches SQLite `UNIQUE constraint` errors on the `isbn` column and re-throws as `Error("A book with this ISBN already exists")`.
- [ ] Existing methods (`create`, `findById`, `findAll`) remain unaffected.

## Implementation Notes

1. **Dynamic SET clause construction**: Iterate over the allowed field names, filter to only those present in the `fields` object, and build an array of `column = ?` fragments. Append `updated_at = ?` unconditionally. Join the fragments with `, ` to form the full `SET` clause.

2. **Prepared statement values**: Collect the corresponding values in the same order as the SET fragments, append the current ISO-8601 timestamp for `updated_at`, and finally append `id` for the `WHERE` clause.

3. **Execution flow**:
   ```
   UPDATE books SET <dynamic columns>, updated_at = ? WHERE id = ?
   ```
   Check `result.changes` — if `0`, return `null`. Otherwise, execute `SELECT * FROM books WHERE id = ?` and return the row.

4. **Duplicate ISBN handling**: Wrap the update execution in a try/catch. If the caught error message includes `UNIQUE constraint failed: books.isbn`, throw a new `Error("A book with this ISBN already exists")`.

5. **Allowed fields whitelist**: Only permit `title`, `author`, `isbn`, `published_year`, `status`, `checked_out_at` to prevent injection of arbitrary column names.

## Dependencies

- #124 — Implement Book model `create` method (establishes the `src/models/book.js` module and the base DAO pattern)

## References

- Tasks file: `plan\tasks\tasks-tier-2-data-layer.json`
- Tier document: `plan\tiers\tier-2-data-layer.md`
