TITLE:
Add unit tests for Book model findById method

BODY:
## Context

This issue adds two unit tests for the `findById` method on the Book data-access object (`src/models/book.js`). These tests extend the existing `test/models/book.test.js` test file that was set up in #128, which already contains the shared `beforeEach`/`afterEach` lifecycle (fresh in-memory database + migrations) and the `makeBook` test data factory.

The `findById` method itself was implemented in #125. These tests verify its two key behaviours: returning `null` when no matching row exists and returning the correct book object when a match is found.

This work is part of **Tier 2: Data Persistence & Book Model**, which introduces SQLite-backed persistence and validates the Book model through comprehensive unit tests.

## Acceptance Criteria

- [ ] Test case 5 is added: `findById` returns `null` when called with a non-existent ID against an empty database.
- [ ] Test case 6 is added: `findById` returns the correct book object whose fields match the previously inserted data (verified via `create` then `findById` using the returned `id`).
- [ ] Both new tests pass when running `npm test`.
- [ ] All existing tests (Tier 1 health endpoint + Tier 2 `create` tests from #128) continue to pass.
- [ ] Tests use in-memory databases exclusively — no database files are created on disk during test runs.

## Implementation Notes

- **File to modify**: `test/models/book.test.js`
- **Test 5 — `findById` returns `null` for a non-existent ID**:
  - Setup: Empty database (no inserts needed beyond the `beforeEach` migration).
  - Action: Call `Book.findById(db, 'nonexistent-uuid')`.
  - Assertion: Result is strictly `null`.
- **Test 6 — `findById` returns the correct book**:
  - Setup: Insert a book via `Book.create(db, makeBook())` and capture the returned object (which includes the generated `id`).
  - Action: Call `Book.findById(db, insertedBook.id)`.
  - Assertion: The returned object matches the inserted data — verify `id`, `title`, `author`, `isbn`, `published_year`, `status` (`'available'`), and that `created_at`/`updated_at` are present.
- Reuse the existing `makeBook(overrides)` helper for test data construction.
- Group the new tests under a `describe('findById', ...)` block (or equivalent) within the existing test file.

## Dependencies

- #125 — Implement Book model `findById` method (must be implemented before these tests can pass)
- #128 — Write unit tests for Book model `create` method (establishes the test file, lifecycle hooks, and test data factory)

## References

- Tasks file: `plan\tasks\tasks-tier-2-data-layer.json`
- Tier document: `plan\tiers\tier-2-data-layer.md`
