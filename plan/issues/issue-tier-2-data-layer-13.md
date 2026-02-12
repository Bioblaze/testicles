TITLE:
Write unit tests for Book model findAll method

BODY:
## Context

This issue adds unit tests for the `findAll` method on the Book data-access object (`src/models/book.js`). The `findAll` method supports paginated retrieval of books and returns both a page of results and the total count. These tests belong in `test/models/book.test.js`, which already contains tests for `create` and `findById` from prior issues. The test file uses a fresh in-memory SQLite database per test (via `beforeEach`/`afterEach`) and the shared `makeBook` test data factory.

This work is part of **Tier 2: Data Persistence & Book Model**, which introduces the SQLite persistence layer, the Book model, and comprehensive unit test coverage for all model methods.

## Acceptance Criteria

- [ ] Test case 7 is implemented: `findAll` returns `{ books: [], total: 0 }` when no books exist in the database.
- [ ] Test case 8 is implemented: `findAll` respects `limit` and `offset` pagination — insert 5 books with unique ISBNs, call `findAll(db, { limit: 2, offset: 2 })`, assert exactly 2 books are returned and `total` is 5.
- [ ] Both new tests pass when running `npm test`.
- [ ] All existing tests (Tier 1 health endpoint, `create` tests, `findById` tests) continue to pass.
- [ ] Tests use in-memory databases exclusively — no database files are created on disk during test runs.

## Implementation Notes

### Test 7 — `findAll` returns empty result when no books exist

- **Setup:** Fresh in-memory database with migrations applied (no books inserted).
- **Action:** Call `findAll(db, {})` (relying on default `limit: 20`, `offset: 0`).
- **Assertion:** Result is `{ books: [], total: 0 }`. Verify `books` is an empty array and `total` is strictly `0`.

### Test 8 — `findAll` respects `limit` and `offset` pagination

- **Setup:** Insert 5 books using `create(db, makeBook({ isbn: uniqueIsbn }))` with unique ISBNs for each (e.g., suffixed `-1` through `-5`).
- **Action:** Call `findAll(db, { limit: 2, offset: 2 })`.
- **Assertions:**
  - `books` array has exactly 2 elements.
  - `total` is `5` (reflects the full count of books in the table, not the page size).
  - Each returned book has the expected shape (contains `id`, `title`, `author`, `isbn`, `published_year`, `status`, `created_at`, `updated_at`).

### General guidance

- Add tests within the existing `describe('Book model', ...)` block in `test/models/book.test.js`, grouped under a `describe('findAll', ...)` sub-block.
- Reuse the existing `makeBook(overrides)` factory and `beforeEach`/`afterEach` lifecycle hooks already in the file.
- Results are ordered by `created_at DESC` per the `findAll` implementation — keep this in mind if asserting on ordering.

## Dependencies

- #126 — Implement Book model `findAll` method (the method under test must exist)
- #128 — Write unit tests for Book model `create` method (establishes the test file, lifecycle hooks, and `makeBook` factory)

## References

- Tasks file: `plan\tasks\tasks-tier-2-data-layer.json`
- Tier document: `plan\tiers\tier-2-data-layer.md`
