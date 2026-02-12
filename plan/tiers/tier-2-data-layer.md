# Tier 2: Data Persistence & Book Model

---

## Objective

Introduce a persistence layer using SQLite, define the Book data model and schema, implement database lifecycle management (connection factory, migration runner, teardown), and validate the model in isolation through comprehensive unit tests.

---

## Dependencies

| Package | Version Strategy | Purpose |
|---|---|---|
| `better-sqlite3` | latest | Synchronous SQLite driver — supports file-based and in-memory databases with zero external configuration |
| `uuid` | latest | Generates RFC 4122 v4 UUIDs for book identifiers |

Install command:

```bash
npm install better-sqlite3 uuid
```

---

## Project Structure (additions to Tier 1)

```
src/
├── db/
│   ├── connection.js            # Database connection factory
│   ├── migrate.js               # Schema migration runner
│   └── migrations/
│       └── 001_create_books.sql # Initial books table DDL
└── models/
    └── book.js                  # Book data-access object (DAO)
test/
└── models/
    └── book.test.js             # Unit tests for the Book model
```

---

## Database Schema

### `001_create_books.sql`

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

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `TEXT` | Primary key | UUID v4, generated application-side via `uuid` |
| `title` | `TEXT` | `NOT NULL` | Book title |
| `author` | `TEXT` | `NOT NULL` | Book author |
| `isbn` | `TEXT` | `NOT NULL`, `UNIQUE` | ISBN-10 or ISBN-13; uniqueness enforced at DB level |
| `published_year` | `INTEGER` | `NOT NULL` | Four-digit year |
| `status` | `TEXT` | `NOT NULL`, default `"available"` | Enum: `available`, `checked_out` |
| `checked_out_at` | `TEXT` | Nullable | ISO-8601 timestamp; `null` when available |
| `created_at` | `TEXT` | `NOT NULL`, auto-default | Set to current UTC timestamp on insert |
| `updated_at` | `TEXT` | `NOT NULL`, auto-default | Bumped on every update |

---

## File-by-File Implementation Details

### `src/db/connection.js` — Database Connection Factory

Exports a single function:

```javascript
function getDatabase(filepath)
```

**Behavior**:
- Accepts an optional `filepath` argument.
- If `NODE_ENV === 'test'` and no filepath is provided, defaults to `':memory:'` so tests run entirely in-memory with full isolation and no disk I/O.
- If `NODE_ENV !== 'test'` and no filepath is provided, defaults to `'./data/books.db'` (or a configurable path from `process.env.DB_PATH`).
- Returns a `better-sqlite3` database instance.
- Enables WAL mode (`PRAGMA journal_mode = WAL`) for better concurrent read performance in production.
- Enables foreign keys (`PRAGMA foreign_keys = ON`) for future relational integrity.

**Example**:

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

### `src/db/migrate.js` — Schema Migration Runner

Exports a single function:

```javascript
function migrate(db)
```

**Behavior**:
1. Creates a `_migrations` meta-table if it does not exist:
   ```sql
   CREATE TABLE IF NOT EXISTS _migrations (
     name TEXT PRIMARY KEY,
     applied_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   ```
2. Reads all `.sql` files from the `migrations/` directory in lexicographic order.
3. For each migration file:
   - Checks if `name` already exists in `_migrations`.
   - If not, executes the SQL within a transaction.
   - Records the migration name in `_migrations`.
4. This ensures migrations are **idempotent** — running `migrate()` multiple times has no side effects.

**Key design decisions**:
- Uses `fs.readdirSync` + `fs.readFileSync` to load SQL files (synchronous I/O matches `better-sqlite3`'s synchronous API).
- Each migration runs inside `db.transaction(...)` so partial failures roll back cleanly.
- The `_migrations` table acts as a simple version ledger.

### `src/models/book.js` — Book Data-Access Object

Exports an object with four methods. Each method accepts the `db` instance as its first argument (dependency injection for testability).

#### `create(db, { title, author, isbn, published_year })`

- Generates a UUID v4 for the `id` field.
- Validates that all four required fields are present; throws a descriptive `Error` if any are missing.
- Inserts the record with a prepared statement.
- Catches SQLite `UNIQUE constraint` errors on `isbn` and re-throws as a descriptive duplicate error.
- Returns the full book object by selecting the newly inserted row.

#### `findById(db, id)`

- Executes `SELECT * FROM books WHERE id = ?`.
- Returns the book object, or `null` if no row matches.

#### `findAll(db, { limit, offset })`

- Defaults: `limit = 20`, `offset = 0`.
- Executes a paginated `SELECT * FROM books ORDER BY created_at DESC LIMIT ? OFFSET ?`.
- Executes a parallel `SELECT COUNT(*) AS total FROM books` for total count.
- Returns `{ books: Book[], total: number }`.

#### `update(db, id, fields)`

- Accepts a partial `fields` object (any subset of `title`, `author`, `isbn`, `published_year`, `status`, `checked_out_at`).
- Dynamically builds the `SET` clause from the provided fields.
- Always sets `updated_at` to the current ISO-8601 timestamp.
- Executes the update with a prepared statement.
- If no rows are affected (book not found), returns `null`.
- Otherwise, returns the updated book object by re-selecting the row.

**Validation rules in the model layer**:
- `create`: All of `title`, `author`, `isbn`, `published_year` are required. Missing fields throw an `Error` with message indicating which field is missing.
- Duplicate `isbn` on `create` or `update` throws an `Error` with message `"A book with this ISBN already exists"`.

---

## `.gitignore` Updates

Add the following entries to ensure database files are never committed:

```
*.db
data/
```

---

## Tests

### `test/models/book.test.js`

Each test creates a fresh in-memory database in `beforeEach` (via `getDatabase(':memory:')`) and runs migrations. The database is closed in `afterEach` to prevent handle leaks.

| # | Test Case | Setup | Action | Assertion |
|---|---|---|---|---|
| 1 | `create` inserts a book and returns it with a generated `id` | Empty DB | Call `create(db, validBookData)` | Returned object has all fields including a valid UUID `id`, `status: "available"`, `created_at`, `updated_at` |
| 2 | `create` rejects duplicate ISBN with a descriptive error | Insert one book | Call `create(db, { ...differentBook, isbn: sameIsbn })` | Throws error containing `"ISBN already exists"` |
| 3 | `create` rejects missing required fields | Empty DB | Call `create(db, {})` | Throws error indicating missing fields |
| 4 | `create` rejects missing `title` specifically | Empty DB | Call `create(db, { author, isbn, published_year })` | Throws error mentioning `title` |
| 5 | `findById` returns `null` for a non-existent ID | Empty DB | Call `findById(db, 'nonexistent-uuid')` | Returns `null` |
| 6 | `findById` returns the correct book | Insert one book | Call `findById(db, knownId)` | Returned object matches inserted data |
| 7 | `findAll` returns empty array when no books exist | Empty DB | Call `findAll(db, {})` | Returns `{ books: [], total: 0 }` |
| 8 | `findAll` respects `limit` and `offset` pagination | Insert 5 books | Call `findAll(db, { limit: 2, offset: 2 })` | Returns exactly 2 books, `total` is 5 |
| 9 | `update` modifies only supplied fields and bumps `updated_at` | Insert one book, note original `updated_at` | Call `update(db, id, { title: 'New Title' })` | Title is changed, other fields unchanged, `updated_at` is newer |
| 10 | `update` returns `null` for a non-existent ID | Empty DB | Call `update(db, 'nonexistent', { title: 'X' })` | Returns `null` |
| 11 | Migrations are idempotent (running twice does not error) | Fresh DB | Call `migrate(db)` twice | No error thrown, tables exist correctly |

**Test data factory**:

```javascript
function makeBook(overrides = {}) {
  return {
    title: 'Test Book',
    author: 'Test Author',
    isbn: '978-3-16-148410-0',
    published_year: 2023,
    ...overrides,
  };
}
```

---

## Acceptance Criteria

- [ ] `better-sqlite3` and `uuid` are installed and listed in `package.json`.
- [ ] `src/db/connection.js` returns an in-memory database when `NODE_ENV=test`.
- [ ] `src/db/migrate.js` applies migrations idempotently and tracks them in `_migrations`.
- [ ] `001_create_books.sql` creates the `books` table with all specified columns and constraints.
- [ ] `src/models/book.js` exposes `create`, `findById`, `findAll`, and `update` methods.
- [ ] All 11 model unit tests pass.
- [ ] All Tier 1 tests continue to pass (health endpoint unaffected).
- [ ] CI pipeline remains green.
- [ ] Database files (`*.db`, `data/`) are git-ignored.
- [ ] Tests use in-memory databases exclusively — no files created during test runs.
