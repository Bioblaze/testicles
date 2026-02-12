TITLE:
Create test/services/checkout.test.js with test setup and checkoutBook tests

BODY:
## Context

This is part of **Tier 5: Checkout & Return System**, which implements the book checkout/return lifecycle with atomic database transactions, custom error classes, and comprehensive tests at both the service and route levels.

This task creates the unit test file `test/services/checkout.test.js` and implements the test setup (`beforeEach`) along with the first four tests covering the `checkoutBook` function. Each test runs against a fresh in-memory `better-sqlite3` database with migrations applied and a seeded book, ensuring full isolation between tests.

These tests validate the happy path (status transition and timestamp recording) and both error branches (`BookNotFoundError` for missing books, `BookUnavailableError` for invalid state transitions).

## Acceptance Criteria

- [ ] Create `test/services/checkout.test.js`.
- [ ] `beforeEach` creates a fresh in-memory `better-sqlite3` database for every test.
- [ ] `beforeEach` runs migrations to create the `books` table.
- [ ] `beforeEach` seeds a book with `status: 'available'` for use in tests.
- [ ] Test 1: `checkoutBook` transitions `available` → `checked_out` — assert the returned book has `status: 'checked_out'`.
- [ ] Test 2: `checkoutBook` sets `checked_out_at` to a valid ISO-8601 string (not `null`).
- [ ] Test 3: `checkoutBook` throws `BookNotFoundError` when called with a non-existent UUID.
- [ ] Test 4: `checkoutBook` throws `BookUnavailableError` with message `'Book is already checked out'` when called on an already checked-out book.
- [ ] All four tests pass when run via `npm test`.

## Implementation Notes

### Test Setup (`beforeEach`)

Each test gets a completely isolated database:

1. Create an in-memory `better-sqlite3` database (`new Database(':memory:')`).
2. Run the project's migrations to create the `books` table (including `status`, `checked_out_at`, `updated_at` columns).
3. Seed a single book with `status: 'available'` and store its `id` for use in test cases.

### Test Cases

#### Test 1 — `checkoutBook` transitions `available` → `checked_out`

- **Setup**: Use the seeded available book.
- **Action**: Call `checkoutBook(db, id)`.
- **Assertion**: The returned book object has `status` equal to `'checked_out'`.

#### Test 2 — `checkoutBook` sets `checked_out_at` to a valid ISO-8601 string

- **Setup**: Use the seeded available book.
- **Action**: Call `checkoutBook(db, id)`.
- **Assertion**: `checked_out_at` is not `null` and is a valid ISO-8601 date string (i.e., `new Date(checked_out_at)` does not produce `Invalid Date`).

#### Test 3 — `checkoutBook` throws `BookNotFoundError` for non-existent UUID

- **Setup**: No additional seeding (use a UUID that doesn't exist in the database).
- **Action**: Call `checkoutBook(db, 'non-existent-uuid')`.
- **Assertion**: The call throws an error that is an instance of `BookNotFoundError`.

#### Test 4 — `checkoutBook` throws `BookUnavailableError` when already checked out

- **Setup**: Use the seeded available book, then call `checkoutBook(db, id)` to transition it to `checked_out`.
- **Action**: Call `checkoutBook(db, id)` a second time.
- **Assertion**: The call throws an error that is an instance of `BookUnavailableError` with `message` equal to `'Book is already checked out'`.

### Key Design Decisions

- **In-memory database per test**: Guarantees complete isolation — no shared state between tests, no cleanup needed.
- **Running real migrations**: Tests validate against the actual schema, catching migration-related bugs.
- **Testing error types via `instanceof`**: Ensures the service layer throws the correct custom error classes, not generic `Error` instances.
- **Asserting error messages**: The `BookUnavailableError` message is part of the API contract (it surfaces in HTTP responses), so it must be tested explicitly.

### File Location

- `test/services/checkout.test.js` (new file)

## Dependencies

- #154 — `checkoutBook` function in `src/services/checkout.js` (must be implemented before these tests can import and exercise it)

## References

- Tasks file: `plan\tasks\tasks-tier-5-checkout-return.json`
- Tier document: `plan\tiers\tier-5-checkout-return.md`
