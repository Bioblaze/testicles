TITLE:
Implement POST /books route in src/routes/books.js

BODY:
## Context

This issue introduces the `POST /books` endpoint as part of [Tier 3: Create Book & List Books Endpoints](plan/tiers/tier-3-create-list-endpoints.md). The route lives in a new `src/routes/books.js` file, uses an Express Router, and leverages `express-validator` for declarative input validation. The `validate` middleware (#135) short-circuits invalid requests before they reach the model layer, and the Book model's `create` method (from Tier 2) handles persistence.

## Dependencies

- #133 — `express-validator` must be installed
- #134 — `src/routes/` directory must exist
- #135 — `validate` middleware must be implemented

## Implementation Notes

### File: `src/routes/books.js`

Create the file with an Express `Router`. Define `POST /` with the following middleware chain:

1. `body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 255 }).withMessage('Title must not exceed 255 characters')`
2. `body('author').trim().notEmpty().withMessage('Author is required').isLength({ max: 255 }).withMessage('Author must not exceed 255 characters')`
3. `body('isbn').notEmpty().withMessage('ISBN is required').isISBN().withMessage('ISBN must be a valid ISBN-10 or ISBN-13')`
4. `body('published_year').isInt({ min: 1000, max: new Date().getFullYear() }).withMessage('Published year must be an integer between 1000 and the current year')`
5. The `validate` middleware (imported from `../middleware/validate`)

### Handler Logic

- Extract `{ title, author, isbn, published_year }` from `req.body`.
- Obtain the database instance via `req.app.locals.db`.
- Call `book.create(db, { title, author, isbn, published_year })`.
- On success, respond with HTTP `201` and the full created book object.
- Catch duplicate ISBN errors (SQLite `UNIQUE constraint` violation on `isbn`) and respond with HTTP `409 Conflict` and body `{ error: "A book with this ISBN already exists" }`.

### Validation Rules Summary

| Field | Rules |
|---|---|
| `title` | Required, non-empty after trim, max 255 characters |
| `author` | Required, non-empty after trim, max 255 characters |
| `isbn` | Required, must pass `isISBN()` (ISBN-10 or ISBN-13) |
| `published_year` | Required, integer between 1000 and current year inclusive |

### Response Formats

- **201 Created** — Returns the full book object (includes `id`, `title`, `author`, `isbn`, `published_year`, `status`, `checked_out_at`, `created_at`, `updated_at`).
- **400 Bad Request** — Handled by the `validate` middleware; returns `{ errors: [{ field, message }] }`.
- **409 Conflict** — Returns `{ error: "A book with this ISBN already exists" }`.

## Acceptance Criteria

- [ ] `src/routes/books.js` exists and exports an Express Router.
- [ ] `POST /` route is defined with the five-step validation middleware chain followed by the handler.
- [ ] Valid requests create a book via `book.create()` and return `201` with the full book object.
- [ ] Validation failures are caught by the `validate` middleware and return `400` with a structured error array.
- [ ] Duplicate ISBN submissions return `409 Conflict` with `{ error: "A book with this ISBN already exists" }`.
- [ ] Invalid requests never reach the model layer (validation middleware short-circuits).
- [ ] All existing Tier 1 and Tier 2 tests continue to pass.

## References

- Tasks file: `plan\tasks\tasks-tier-3-create-list-endpoints.json`
- Tier document: `plan\tiers\tier-3-create-list-endpoints.md`
- Dependencies: #133, #134, #135
