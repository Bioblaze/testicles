TITLE:
Create custom error class hierarchy (AppError, BookNotFoundError, BookUnavailableError) in src/errors.js

BODY:
## Context

This is the first task in Tier 5 (Checkout & Return System) for the `book-api` project. Before the checkout/return service layer or route handlers can be implemented, the project needs a set of application-specific error classes that carry HTTP status codes for clean error-to-response mapping. This task introduces `src/errors.js` with a three-class hierarchy: a base `AppError` that extends the native `Error` with a `statusCode` property, and two domain-specific subclasses — `BookNotFoundError` (404) and `BookUnavailableError` (409). These classes are thrown by the service layer (`src/services/checkout.js`) and caught by route handlers in `src/routes/books.js` to produce the correct HTTP responses without coupling business logic to HTTP concerns. This foundational module is a prerequisite for every other task in Tier 5.

## What needs to happen

1. Create `src/errors.js` with three exported classes:
   - **`AppError extends Error`** — Base application error class.
     - Constructor accepts `message` (string) and `statusCode` (number).
     - Calls `super(message)`.
     - Sets `this.name = this.constructor.name` so that `instanceof` checks and error names are correct for subclasses.
     - Stores `this.statusCode = statusCode`.
   - **`BookNotFoundError extends AppError`** — Used when a book ID does not exist in the database.
     - Constructor accepts an optional `message` parameter, defaulting to `'Book not found'`.
     - Passes the message and `404` as the status code to the `AppError` constructor.
   - **`BookUnavailableError extends AppError`** — Used when an invalid state transition is attempted (e.g., checking out an already checked-out book).
     - Constructor accepts a required `message` parameter (the caller supplies the specific reason).
     - Passes the message and `409` as the status code to the `AppError` constructor.
2. Export all three classes via `module.exports = { AppError, BookNotFoundError, BookUnavailableError }`.

## Acceptance Criteria

- [ ] `src/errors.js` exists and exports `AppError`, `BookNotFoundError`, and `BookUnavailableError`.
- [ ] `AppError` extends `Error`, accepts `message` and `statusCode`, and sets `this.name = this.constructor.name`.
- [ ] `new AppError('test', 500)` produces an error with `name: 'AppError'`, `message: 'test'`, `statusCode: 500`.
- [ ] `BookNotFoundError` extends `AppError` and defaults `message` to `'Book not found'` and `statusCode` to `404`.
- [ ] `new BookNotFoundError()` produces an error with `name: 'BookNotFoundError'`, `message: 'Book not found'`, `statusCode: 404`.
- [ ] `new BookNotFoundError('Custom message')` produces an error with `message: 'Custom message'` and `statusCode: 404`.
- [ ] `BookUnavailableError` extends `AppError` and sets `statusCode` to `409`.
- [ ] `new BookUnavailableError('Book is already checked out')` produces an error with `name: 'BookUnavailableError'`, `message: 'Book is already checked out'`, `statusCode: 409`.
- [ ] `instanceof` checks work correctly: `new BookNotFoundError() instanceof AppError === true` and `new BookNotFoundError() instanceof Error === true`.
- [ ] All prior tier tests (Tier 1 through Tier 4) continue to pass.

## Implementation Notes

- **`this.name = this.constructor.name`** ensures that when a subclass is instantiated, `name` reflects the subclass (e.g., `'BookNotFoundError'`), not the parent class. This makes error logs and `instanceof` checks more informative.
- The `statusCode` property enables route handlers to map caught errors directly to HTTP responses without needing a lookup table or conditional chains on error types.
- `BookNotFoundError` provides a sensible default message (`'Book not found'`) because the 404 case is almost always the same message. An optional override is accepted for flexibility.
- `BookUnavailableError` requires a message because the 409 reason varies by context (e.g., `'Book is already checked out'` vs. `'Book is not currently checked out'`).
- No new npm dependencies are required — this module uses only native JavaScript class syntax.
- Downstream consumers: `src/services/checkout.js` (throws these errors), `src/routes/books.js` (catches them for HTTP mapping).

## Dependencies

None — this is the first task in Tier 5 and has no dependency on other Tier 5 tasks.

## References

- Tasks file: `plan/tasks/tasks-tier-5-checkout-return.json`
- Tier document: `plan/tiers/tier-5-checkout-return.md`
