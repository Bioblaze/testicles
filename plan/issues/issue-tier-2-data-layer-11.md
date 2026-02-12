TITLE:
Write unit tests for Book model create method (test/models/book.test.js)

BODY:
## Context

As part of **Tier 2 – Data Persistence & Book Model**, we need comprehensive unit tests covering the `create` method of the Book data-access object (`src/models/book.js`). This test file (`test/models/book.test.js`) establishes the test scaffold (database lifecycle hooks, test data factory) that all subsequent Book model test cases will build upon.

Each test must run against a fresh in-memory SQLite database to guarantee full isolation, zero disk I/O, and deterministic results.

## Acceptance Criteria

- [ ] `test/models/book.test.js` exists and is loadable by the test runner.
- [ ] `beforeEach` creates a fresh in-memory database via `getDatabase(':memory:')` and runs migrations.
- [ ] `afterEach` closes the database to prevent handle leaks.
- [ ] A `makeBook(overrides)` test factory is defined and used across tests:
  ```js
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
- [ ] **Test 1** – `create` inserts a book and returns it with a valid UUID `id`, `status: 'available'`, `created_at`, and `updated_at`.
- [ ] **Test 2** – `create` rejects duplicate ISBN with a descriptive error containing `"ISBN already exists"`.
- [ ] **Test 3** – `create` rejects missing required fields when called with an empty object.
- [ ] **Test 4** – `create` rejects missing `title` specifically, throwing an error whose message mentions `title`.
- [ ] All four test cases pass (`npm test`).
- [ ] Tests use in-memory databases exclusively — no files created on disk during test runs.
- [ ] All existing Tier 1 tests continue to pass.

## Implementation Notes

### Database Lifecycle

```js
let db;

beforeEach(() => {
  db = getDatabase(':memory:');
  migrate(db);
});

afterEach(() => {
  db.close();
});
```

### Test Cases Detail

| # | Test Case | Setup | Action | Assertion |
|---|-----------|-------|--------|-----------|
| 1 | `create` returns a book with generated fields | Empty DB | `create(db, makeBook())` | Returned object includes valid UUID `id`, `status === 'available'`, non-null `created_at` and `updated_at` |
| 2 | `create` rejects duplicate ISBN | Insert one book | `create(db, makeBook({ title: 'Other', author: 'Other', isbn: sameIsbn }))` | Throws error containing `"ISBN already exists"` |
| 3 | `create` rejects empty object | Empty DB | `create(db, {})` | Throws error indicating missing fields |
| 4 | `create` rejects missing `title` | Empty DB | `create(db, { author: 'A', isbn: '000', published_year: 2023 })` | Throws error mentioning `title` |

### UUID Validation

Use a regex to assert the returned `id` is a valid UUID v4:

```js
const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
expect(book.id).toMatch(uuidV4Regex);
```

### Key Considerations

- The `makeBook` factory and lifecycle hooks established here are reused by subsequent test tasks (#12, #13, #14) that cover `findById`, `findAll`, `update`, and migration idempotency.
- Error assertions should use `toThrow` (or equivalent) and verify descriptive messages, not raw SQLite constraint text.

## Dependencies

- #121 — Database connection factory (`src/db/connection.js`)
- #123 — Schema migration runner (`src/db/migrate.js`)
- #124 — Book model `create` method (`src/models/book.js`)

## References

- Tasks file: `plan\tasks\tasks-tier-2-data-layer.json`
- Tier document: `plan\tiers\tier-2-data-layer.md`
