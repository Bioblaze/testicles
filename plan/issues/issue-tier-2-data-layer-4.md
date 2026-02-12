TITLE:
Implement database connection factory (src/db/connection.js)

BODY:
## Context

As part of **Tier 2: Data Persistence & Book Model**, we need a database connection factory that centralises how the application obtains a `better-sqlite3` database instance. This factory must support both file-based databases for production and in-memory databases for testing, while consistently applying performance and integrity PRAGMAs.

This is a foundational module — the migration runner, Book model, and all downstream database consumers will depend on it.

## Acceptance Criteria

- [ ] `src/db/connection.js` exports a `getDatabase(filepath)` function.
- [ ] When `NODE_ENV === 'test'` and no `filepath` is provided, defaults to `':memory:'` (fully in-memory, no disk I/O).
- [ ] When `NODE_ENV !== 'test'` and no `filepath` is provided, defaults to `process.env.DB_PATH || './data/books.db'`.
- [ ] When a `filepath` argument is explicitly provided, it is used regardless of `NODE_ENV`.
- [ ] The returned database instance has `PRAGMA journal_mode = WAL` enabled for concurrent read performance.
- [ ] The returned database instance has `PRAGMA foreign_keys = ON` enabled for relational integrity.
- [ ] The function returns a valid `better-sqlite3` database instance.
- [ ] No database files are created during test runs (verified by in-memory default).

## Implementation Notes

### Function Signature

```javascript
function getDatabase(filepath) → Database
```

### Behaviour

1. Determine the default path based on environment:
   - `NODE_ENV === 'test'` → `':memory:'`
   - Otherwise → `process.env.DB_PATH || './data/books.db'`
2. Use the explicit `filepath` argument if provided; otherwise use the default.
3. Instantiate a `better-sqlite3` database with the resolved path.
4. Execute `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON`.
5. Return the database instance.

### Reference Implementation

```javascript
const Database = require('better-sqlite3');

function getDatabase(filepath) {
  const defaultPath = process.env.NODE_ENV === 'test'
    ? ':memory:'
    : (process.env.DB_PATH || './data/books.db');

  const dbPath = filepath || defaultPath;
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}

module.exports = { getDatabase };
```

### Key Design Decisions

- **Dependency injection via optional `filepath`**: Allows tests and utilities to override the default path without manipulating environment variables.
- **Environment-aware defaults**: `NODE_ENV=test` automatically selects in-memory databases, ensuring test isolation and speed.
- **WAL mode**: Improves concurrent read performance in production; harmless for in-memory databases.
- **Foreign keys**: Enabled proactively for future relational constraints.

## Dependencies

- #117 — Install production dependencies (`better-sqlite3`, `uuid`)
- #119 — Create project directory structure for db and models

## References

- Tasks file: `plan\tasks\tasks-tier-2-data-layer.json`
- Tier document: `plan\tiers\tier-2-data-layer.md`
