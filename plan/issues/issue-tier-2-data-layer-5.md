TITLE:
Create initial books table migration (src/db/migrations/001_create_books.sql)

BODY:
## Context

As part of **Tier 2: Data Persistence & Book Model**, we need to define the database schema for the library system's core entity — the `books` table. This SQL migration file is the foundation that all subsequent data-access code (connection factory, migration runner, and Book model) will operate against.

The migration must use `CREATE TABLE IF NOT EXISTS` to remain safe for re-execution and must define all columns, types, constraints, and defaults precisely as specified in the tier design document.

This task depends on #119 (project directory structure for `src/db/migrations/` must exist before the file can be created).

## Acceptance Criteria

- [ ] File `src/db/migrations/001_create_books.sql` exists and contains a valid `CREATE TABLE IF NOT EXISTS books` statement.
- [ ] The table includes the following columns with exact types and constraints:

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | UUID v4, generated application-side |
| `title` | `TEXT` | `NOT NULL` | Book title |
| `author` | `TEXT` | `NOT NULL` | Book author |
| `isbn` | `TEXT` | `NOT NULL UNIQUE` | ISBN-10 or ISBN-13; uniqueness enforced at DB level |
| `published_year` | `INTEGER` | `NOT NULL` | Four-digit year |
| `status` | `TEXT` | `NOT NULL DEFAULT 'available'` | Enum: `available`, `checked_out` |
| `checked_out_at` | `TEXT` | Nullable | ISO-8601 timestamp; `NULL` when available |
| `created_at` | `TEXT` | `NOT NULL DEFAULT (datetime('now'))` | UTC timestamp set on insert |
| `updated_at` | `TEXT` | `NOT NULL DEFAULT (datetime('now'))` | Bumped on every update |

- [ ] The SQL file is syntactically valid and can be executed by `better-sqlite3` without errors.
- [ ] The `CREATE TABLE IF NOT EXISTS` guard ensures the migration is idempotent.
- [ ] The file uses `(datetime('now'))` (with parentheses) for default timestamp expressions, as required by SQLite.

## Implementation Notes

The exact SQL to place in `src/db/migrations/001_create_books.sql`:

```sql
CREATE TABLE IF NOT EXISTS books (
  id              TEXT    PRIMARY KEY,
  title           TEXT    NOT NULL,
  author          TEXT    NOT NULL,
  isbn            TEXT    NOT NULL UNIQUE,
  published_year  INTEGER NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'available',
  checked_out_at  TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

Key points:
- This is a single-statement DDL file. No transaction wrapper is needed here — the migration runner (`src/db/migrate.js`, a later task) handles transactional execution.
- The `IF NOT EXISTS` clause provides a safety net, but the migration runner's `_migrations` tracking table is the primary idempotency mechanism.
- Default values for `created_at` and `updated_at` use SQLite's `datetime('now')` function wrapped in parentheses, which is required for expression defaults in SQLite.
- The `status` column defaults to `'available'` and will be managed as an application-level enum (`available`, `checked_out`).
- The `checked_out_at` column is intentionally nullable — it is `NULL` when `status` is `available`.

## Dependencies

- #119 — Create project directory structure for db and models (must exist before this file can be created)

## References

- Tasks file: `plan\tasks\tasks-tier-2-data-layer.json`
- Tier document: `plan\tiers\tier-2-data-layer.md`
