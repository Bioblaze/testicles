TITLE:
Implement Book model create method (src/models/book.js)

BODY:
## Context

As part of **Tier 2 — Data Persistence & Book Model**, the project needs a Book data-access object (DAO) that encapsulates all database operations for the `books` table. This issue covers the initial creation of `src/models/book.js` and the implementation of its `create` method — the foundational write operation that all other model methods and downstream features depend on.

The `create` method is responsible for generating a UUID v4 identifier, validating required input fields, inserting a new record via a prepared statement, handling duplicate ISBN constraint violations gracefully, and returning the fully-hydrated book object. This method must work against the `books` table schema established by the migration runner (#123) and uses the `uuid` package installed in #117.

## Acceptance Criteria

- [ ] `src/models/book.js` exists and exports an object with a `create` method.
- [ ] `create(db, { title, author, isbn, published_year })` generates a UUID v4 for the `id` field using the `uuid` package.
- [ ] All four required fields (`title`, `author`, `isbn`, `published_year`) are validated as present before insertion; a descriptive `Error` is thrown if any field is missing, indicating **which** field is absent.
- [ ] The record is inserted using a **prepared statement** (not string interpolation) for safety and performance.
- [ ] SQLite `UNIQUE constraint` errors on the `isbn` column are caught and re-thrown as `Error("A book with this ISBN already exists")`.
- [ ] After successful insertion, the method returns the **full book object** by selecting the newly inserted row (including server-defaulted fields like `status`, `created_at`, and `updated_at`).
- [ ] The returned book object contains: `id`, `title`, `author`, `isbn`, `published_year`, `status` (`"available"`), `checked_out_at` (`null`), `created_at`, and `updated_at`.
- [ ] The module accepts `db` as its first argument (dependency injection) for testability — it does not import or manage its own database connection.
- [ ] The module has no side effects on import (no top-level execution).

## Implementation Notes

### Exported API

```javascript
const Book = {
  create(db, { title, author, isbn, published_year }) { ... },
  // findById, findAll, update — added in subsequent issues
};

module.exports = Book;
```

### Algorithm

1. **Validate required fields**: Check that `title`, `author`, `isbn`, and `published_year` are all present (not `undefined`, `null`, or empty string). If any are missing, throw an `Error` with a message indicating the missing field(s).
2. **Generate ID**: Call `uuid.v4()` to produce a new UUID for the `id` column.
3. **Insert with prepared statement**:
   ```javascript
   const stmt = db.prepare(`
     INSERT INTO books (id, title, author, isbn, published_year)
     VALUES (?, ?, ?, ?, ?)
   `);
   ```
4. **Execute the insert** inside a `try/catch`:
   - On success, proceed to step 5.
   - On `UNIQUE constraint failed: books.isbn`, re-throw as `Error("A book with this ISBN already exists")`.
5. **Return the full row**: Execute `SELECT * FROM books WHERE id = ?` with the generated ID and return the result.

### Error Handling

- **Missing fields**: Thrown *before* any database interaction. The error message should be developer-friendly, e.g., `"Missing required field: title"`.
- **Duplicate ISBN**: Detected by catching the SQLite error whose `message` contains `UNIQUE constraint failed: books.isbn`. Re-thrown as a domain-specific error: `"A book with this ISBN already exists"`.

### File Location

```
src/models/book.js
```

### Database Schema (for reference)

The `create` method inserts into the `books` table with the following columns. Only `id`, `title`, `author`, `isbn`, and `published_year` are provided at insert time; `status`, `created_at`, and `updated_at` use their column defaults.

| Column | Provided by `create` | Default |
|---|---|---|
| `id` | Yes (UUID v4) | — |
| `title` | Yes | — |
| `author` | Yes | — |
| `isbn` | Yes | — |
| `published_year` | Yes | — |
| `status` | No | `'available'` |
| `checked_out_at` | No | `NULL` |
| `created_at` | No | `datetime('now')` |
| `updated_at` | No | `datetime('now')` |

### Dependencies

- #117 — Install production dependencies (`better-sqlite3`, `uuid`) — provides the `uuid` package used for ID generation.
- #123 — Schema migration runner (`src/db/migrate.js`) — ensures the `books` table exists before `create` is called.

## References

- Tasks file: `plan\tasks\tasks-tier-2-data-layer.json`
- Tier document: `plan\tiers\tier-2-data-layer.md`
- Depends on: #117, #123
