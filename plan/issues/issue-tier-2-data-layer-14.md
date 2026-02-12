TITLE:
Add unit tests for Book model update method and migration idempotency

BODY:
## Context

Tier 2 (Data Persistence & Book Model) defines 11 unit tests for the Book model in `test/models/book.test.js`. Tests 1–8 are covered by earlier issues. This issue adds the remaining three test cases (9, 10, 11) that exercise the `update` method and verify migration idempotency.

All tests use a fresh in-memory SQLite database created in `beforeEach` via `getDatabase(':memory:')` with migrations applied, and the database is closed in `afterEach` to prevent handle leaks.

## Dependencies

- #127 — Implement Book model `update` method (must exist before it can be tested)
- #128 — Unit tests for Book model `create` method (establishes the test file, `beforeEach`/`afterEach` lifecycle, and `makeBook` factory)

## Acceptance Criteria

- [ ] Test case 9: `update` modifies only the supplied fields and bumps `updated_at` to a value newer than the original
  - **Setup:** Insert one book, record its original `updated_at`
  - **Action:** Call `update(db, id, { title: 'New Title' })`
  - **Assert:** Title is changed, all other fields remain unchanged, `updated_at` is strictly newer than the original
- [ ] Test case 10: `update` returns `null` for a non-existent ID
  - **Setup:** Empty database (no books inserted)
  - **Action:** Call `update(db, 'nonexistent', { title: 'X' })`
  - **Assert:** Return value is `null`
- [ ] Test case 11: Migrations are idempotent — calling `migrate(db)` twice does not error and tables exist correctly
  - **Setup:** Fresh in-memory database
  - **Action:** Call `migrate(db)` twice in succession
  - **Assert:** No error is thrown; the `books` and `_migrations` tables exist and are queryable
- [ ] All 11 Book model tests pass (`npm test`)
- [ ] All Tier 1 tests continue to pass (health endpoint unaffected)
- [ ] Tests use in-memory databases exclusively — no files created on disk during test runs

## Implementation Notes

### Test 9 — `update` modifies only supplied fields and bumps `updated_at`

```javascript
// Insert a book, wait briefly or mock time, then update only `title`
const book = Book.create(db, makeBook());
const updated = Book.update(db, book.id, { title: 'New Title' });

expect(updated.title).toBe('New Title');
expect(updated.author).toBe(book.author);        // unchanged
expect(updated.isbn).toBe(book.isbn);              // unchanged
expect(updated.published_year).toBe(book.published_year); // unchanged
expect(new Date(updated.updated_at).getTime())
  .toBeGreaterThanOrEqual(new Date(book.updated_at).getTime());
```

### Test 10 — `update` returns `null` for non-existent ID

Straightforward: call `update` with an ID that does not exist in the database and assert the return value is `null`.

### Test 11 — Migration idempotency

```javascript
// migrate(db) is already called once in beforeEach
// Calling it again should not throw
expect(() => migrate(db)).not.toThrow();

// Verify tables still exist
const tables = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('books','_migrations')"
).all();
expect(tables).toHaveLength(2);
```

### File touched

- `test/models/book.test.js` — append three new `test()`/`it()` blocks to the existing describe block

## References

- Tasks file: `plan\tasks\tasks-tier-2-data-layer.json` (task 14)
- Tier document: `plan\tiers\tier-2-data-layer.md`
- #127 — Implement Book model update method
- #128 — Write unit tests for Book model create method (test file scaffold)
