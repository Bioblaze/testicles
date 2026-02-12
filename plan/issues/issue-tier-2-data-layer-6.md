TITLE:
Implement schema migration runner (src/db/migrate.js)

BODY:
## Context

As part of **Tier 2 — Data Persistence & Book Model**, the project needs a schema migration runner to manage database schema evolution in a controlled, repeatable manner. The migration runner is a critical piece of the data layer: it sits between the database connection factory (#121) and the Book model, ensuring the required tables exist before any data-access code runs.

The runner must be synchronous (matching `better-sqlite3`'s synchronous API), file-driven (reading `.sql` files from a migrations directory), and idempotent (safe to call multiple times without side effects).

## Acceptance Criteria

- [ ] `src/db/migrate.js` exports a `migrate(db)` function that accepts a `better-sqlite3` database instance.
- [ ] On first invocation, a `_migrations` meta-table is created:
  ```sql
  CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  ```
- [ ] The function reads all `.sql` files from the `src/db/migrations/` directory in **lexicographic order** using `fs.readdirSync`.
- [ ] For each migration file, the function checks whether its name already exists in the `_migrations` table.
- [ ] Unapplied migrations are executed inside `db.transaction(...)` so partial failures roll back cleanly.
- [ ] Each successfully applied migration name is recorded in the `_migrations` table.
- [ ] Calling `migrate(db)` multiple times is **idempotent** — no errors, no duplicate rows, no side effects.
- [ ] The module has no side effects on import (no top-level execution).

## Implementation Notes

### Exported API

```javascript
function migrate(db)
```

### Algorithm

1. Ensure `_migrations` table exists (`CREATE TABLE IF NOT EXISTS`).
2. Read migration directory: `fs.readdirSync(migrationsDir)`, filter to `.sql` files, sort lexicographically.
3. Query existing applied migrations from `_migrations` into a `Set` for O(1) lookup.
4. For each unapplied migration file:
   - Read SQL content via `fs.readFileSync(filePath, 'utf-8')`.
   - Wrap execution in `db.transaction(() => { db.exec(sql); insertMigrationRecord(name); })()`.
5. Return (no return value required).

### Key Design Decisions

- **Synchronous I/O** (`fs.readdirSync` / `fs.readFileSync`) is intentional — it matches `better-sqlite3`'s synchronous API and avoids unnecessary async complexity.
- **Transaction per migration** ensures atomicity: if a migration's SQL fails partway through, the entire migration is rolled back and not recorded in `_migrations`.
- **`_migrations` table** serves as a simple version ledger — no sequence numbers or checksums, just the filename as a unique key.
- **Migration directory path** should be resolved relative to the module file (`path.join(__dirname, 'migrations')`) to work correctly regardless of the working directory.

### File Location

```
src/db/migrate.js
```

### Dependencies

- #121 — Database connection factory (`src/db/connection.js`) — provides the `db` instance passed to `migrate()`.
- #122 — Initial books table migration (`src/db/migrations/001_create_books.sql`) — the first migration file the runner will process.

## References

- Tasks file: `plan\tasks\tasks-tier-2-data-layer.json`
- Tier document: `plan\tiers\tier-2-data-layer.md`
- Depends on: #121, #122
