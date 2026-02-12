TITLE:
Implement GET /books/:id handler logic

BODY:
## Context

This is the second task in Tier 4 (View Book Endpoint) for the `book-api` project. With the `GET /:id` route and UUID validation middleware already wired in #142, this task implements the actual handler function that looks up a book by its ID and returns the appropriate response. The handler must call the data-layer method `book.findById(db, id)` and handle both the found and not-found cases, returning structured JSON in every code path. This is a prerequisite for all integration tests in Tier 4 — until the handler produces real responses, the test suite cannot validate behavior.

## What needs to happen

1. In the `GET /:id` route handler in `src/routes/books.js`, implement the following logic:
   - Read `id` from `req.params.id`.
   - Obtain the database reference via `req.app.locals.db`.
   - Call `book.findById(db, id)` to look up the book.
   - If the result is `null`, respond with status `404` and body `{ error: "Book not found" }`.
   - Otherwise, respond with status `200` and the full book object.
2. Ensure no unhandled exceptions are thrown — all code paths must return structured JSON responses.

## Acceptance Criteria

- [ ] `GET /books/:id` returns `200` with the full book object for a valid, existing ID.
- [ ] `GET /books/:id` returns `404` with `{ error: "Book not found" }` for a valid UUID that does not exist in the database.
- [ ] The response body includes every field defined in the book schema (`id`, `title`, `author`, `isbn`, `published_year`, `status`, `checked_out_at`, `created_at`, `updated_at`).
- [ ] The `status` field accurately reflects the current state of the book (e.g., `"available"` for a newly created book).
- [ ] No unhandled exceptions are thrown for any input — all paths return structured JSON.
- [ ] All prior tier tests (Tier 1, Tier 2, Tier 3) continue to pass.

## Implementation Notes

- The route definition and UUID validation middleware are already in place from #142 — this task only replaces the placeholder handler with the real implementation.
- `book.findById(db, id)` is the data-layer method (from Tier 2) that queries the database by primary key and returns the book row or `null`.
- The handler should use `req.app.locals.db` to obtain the database connection, consistent with the pattern established in the `POST /books` and `GET /books` handlers from Tier 3.
- Keep the handler `async` and wrap the body in a try/catch (or use an async error wrapper) so that any unexpected database errors are caught and returned as structured JSON rather than crashing the process.
- Route ordering: this handler is on the `GET /:id` route that was defined after `GET /` in #142 — no reordering is needed.

## Dependencies

- #142 — Add GET /books/:id route with UUID validation in src/routes/books.js

## References

- Tasks file: `plan/tasks/tasks-tier-4-view-endpoint.json`
- Tier document: `plan/tiers/tier-4-view-endpoint.md`
