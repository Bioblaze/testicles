TITLE:
Create checkout_history database migration (002_create_checkout_history.sql)

BODY:
## Context

This is the second task in Tier 7 (API Documentation & Developer Experience) for the `book-api` project. The `checkout_history` table provides a persistent audit trail for every checkout and return event on a book. Downstream tasks — the `checkoutHistory` data-access model, the checkout service transaction modifications, and the `GET /books/:id/history` endpoint — all depend on this table existing. The migration follows the same conventions as the existing `001_*.sql` migration and uses idempotent DDL (`IF NOT EXISTS`) so it can be safely re-run.

## What needs to happen

1. Create the file `src/db/migrations/002_create_checkout_history.sql`.
2. The migration must contain a `CREATE TABLE IF NOT EXISTS checkout_history` statement with the following columns:

   | Column | Type | Constraints | Notes |
   |---|---|---|---|
   | `id` | `TEXT` | `PRIMARY KEY` | UUID v4, generated application-side |
   | `book_id` | `TEXT` | `NOT NULL`, `REFERENCES books(id)` | Foreign key linking the history entry to its book |
   | `action` | `TEXT` | `NOT NULL` | Enum-like values: `"checked_out"` or `"returned"` |
   | `timestamp` | `TEXT` | `NOT NULL` | ISO-8601 timestamp of when the action occurred |

3. The migration must also create an index for efficient history lookups by book:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_checkout_history_book_id
     ON checkout_history(book_id);
   ```
4. Both statements must use `IF NOT EXISTS` for idempotency — running the migration multiple times must not error.

## Acceptance Criteria

- [ ] File `src/db/migrations/002_create_checkout_history.sql` exists.
- [ ] `CREATE TABLE IF NOT EXISTS checkout_history` is used (idempotent).
- [ ] `id` column is `TEXT PRIMARY KEY`.
- [ ] `book_id` column is `TEXT NOT NULL` with a foreign key reference to `books(id)`.
- [ ] `action` column is `TEXT NOT NULL`.
- [ ] `timestamp` column is `TEXT NOT NULL`.
- [ ] Index `idx_checkout_history_book_id` is created on `checkout_history(book_id)` using `CREATE INDEX IF NOT EXISTS`.
- [ ] The migration runs successfully against an existing database that already has the `books` table.
- [ ] Running the migration a second time does not produce errors (idempotency).
- [ ] All prior tier tests continue to pass.

## Implementation Notes

- **File location**: `src/db/migrations/002_create_checkout_history.sql`. The `002` prefix follows the sequential migration numbering convention established by `001_*.sql`.
- **Foreign key**: The `book_id` column references `books(id)`. Ensure SQLite foreign key enforcement is enabled (`PRAGMA foreign_keys = ON`) in the application's database initialization — this should already be handled by the existing database setup from prior tiers.
- **`id` generation**: The `id` column stores a UUID v4 string. The UUID is generated application-side (in the `checkoutHistory.create` model method implemented in a later task), not by the database.
- **`action` column**: Although SQLite does not enforce `CHECK` constraints by default for enum-like behavior, the application layer (the `checkoutHistory.create` method) is responsible for only writing `"checked_out"` or `"returned"` values. No `CHECK` constraint is required in the DDL.
- **`timestamp` column**: Stores ISO-8601 formatted timestamps (e.g., `2025-02-10T15:30:00.000Z`). Using `TEXT` for timestamps is the standard SQLite approach and allows lexicographic ordering to match chronological ordering.
- **Index purpose**: The `idx_checkout_history_book_id` index on `book_id` is critical for the `GET /books/:id/history` endpoint, which queries history entries filtered by `book_id` and ordered by `timestamp DESC`. Without this index, history lookups would require a full table scan.
- **Expected SQL**:
  ```sql
  CREATE TABLE IF NOT EXISTS checkout_history (
    id        TEXT    PRIMARY KEY,
    book_id   TEXT    NOT NULL REFERENCES books(id),
    action    TEXT    NOT NULL,
    timestamp TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_checkout_history_book_id
    ON checkout_history(book_id);
  ```

## Dependencies

None — this task has no dependencies on other Tier 7 tasks.

## References

- Tasks file: `plan/tasks/tasks-tier-7-documentation-history.json`
- Tier document: `plan/tiers/tier-7-documentation-history.md`
