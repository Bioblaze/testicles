TITLE:
Add POST /books/:id/checkout route to src/routes/books.js

BODY:
## Context

This is part of **Tier 5: Checkout & Return System**, which implements the book checkout/return lifecycle with atomic database transactions and custom error handling.

This task adds the `POST /books/:id/checkout` HTTP endpoint to the existing `src/routes/books.js` router. The route wires up the `checkoutBook` service function (already implemented) to an Express route with UUID validation, translating service-layer typed errors into appropriate HTTP responses.

The checkout endpoint enforces the `available → checked_out` state transition:

```
  available ──── checkout ────→ checked_out
      ↑                              │
      └──────── return ──────────────┘
```

This route is a prerequisite for the checkout integration tests and the corresponding return route.

## Acceptance Criteria

- [ ] `POST /:id/checkout` route is added to the existing books router in `src/routes/books.js`.
- [ ] Middleware chain includes `param('id').isUUID(4).withMessage('ID must be a valid UUID v4')` followed by the shared `validate` middleware.
- [ ] Handler reads `id` from `req.params.id` and calls `checkoutBook(db, id)`.
- [ ] On success, responds with `200 OK` and the updated book JSON.
- [ ] Catches `BookNotFoundError` and responds with `404 Not Found` and `{ error: err.message }`.
- [ ] Catches `BookUnavailableError` and responds with `409 Conflict` and `{ error: err.message }`.
- [ ] Re-throws any unexpected errors (so they propagate to Express error handling).
- [ ] `checkoutBook` is imported from `../services/checkout`.
- [ ] `BookNotFoundError` and `BookUnavailableError` are imported from `../errors`.
- [ ] Malformed UUIDs return `400 Bad Request` with `{ errors: [{ field: "id", ... }] }` (handled by existing `validate` middleware).
- [ ] All prior tier tests continue to pass.

## Implementation Notes

### Middleware Chain

```javascript
router.post(
  '/:id/checkout',
  param('id').isUUID(4).withMessage('ID must be a valid UUID v4'),
  validate,
  handler
);
```

1. `param('id').isUUID(4)` — validates the `:id` path parameter is a valid UUID v4. On failure, produces a validation error with the message `'ID must be a valid UUID v4'`.
2. `validate` — the shared validation middleware (already used by other routes) that checks for validation errors and returns `400` with `{ errors: [...] }` if any exist.
3. Handler — the async function that performs the checkout.

### Handler Logic

```javascript
const { checkoutBook } = require('../services/checkout');
const { BookNotFoundError, BookUnavailableError } = require('../errors');

// Inside the handler:
try {
  const updatedBook = checkoutBook(db, id);
  res.json(updatedBook);
} catch (err) {
  if (err instanceof BookNotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof BookUnavailableError) {
    return res.status(409).json({ error: err.message });
  }
  throw err; // Re-throw unexpected errors
}
```

### Key Design Decisions

- **Error mapping via `instanceof`**: Each custom error class maps directly to an HTTP status code. `BookNotFoundError` → `404`, `BookUnavailableError` → `409`. This keeps the route handler thin and the business logic in the service layer.
- **Re-throwing unexpected errors**: Any error that is not a known application error is re-thrown so that Express's default error handler (or a future centralized error handler) can catch it, preventing silent failures.
- **Reusing existing validation pattern**: The `param().isUUID(4)` + `validate` middleware chain follows the same pattern used by other routes in the file, maintaining consistency.

### Required Imports (additions to existing file)

```javascript
const { checkoutBook } = require('../services/checkout');
const { BookNotFoundError, BookUnavailableError } = require('../errors');
```

### File Location

- `src/routes/books.js` (existing file — add the new route)

## Dependencies

- #154 — `checkoutBook` function in `src/services/checkout.js` (the service function called by this route handler)
- #155 — `returnBook` function in `src/services/checkout.js` (completes the checkout module exports; ensures the module is fully implemented before route integration)

## References

- Tasks file: `plan\tasks\tasks-tier-5-checkout-return.json`
- Tier document: `plan\tiers\tier-5-checkout-return.md`
