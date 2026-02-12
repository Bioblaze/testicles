TITLE:
Add integration test: GET /books/:id returns 404 for valid UUID that does not exist

BODY:
## Context

As part of Tier 4 (View Book Endpoint), we need integration tests covering all response branches of `GET /books/:id`. This issue covers **Test #2**: verifying that requesting a valid UUID that does not exist in the database returns `404` with the appropriate error body.

The test file `test/routes/books.view.test.js` and its `beforeEach` seeding setup were created in #144. The `GET /books/:id` route with UUID validation and the handler logic (including the 404 path) were implemented in #142 and #143. This task adds the 404 not-found test case to the existing suite.

## What to Do

In `test/routes/books.view.test.js`, add a test (`it` block) inside the existing `describe('GET /books/:id')` suite that:

1. Sends `GET /books/00000000-0000-4000-8000-000000000000` — a valid UUID v4 that is known not to exist in the database.
2. Asserts the response status is `404`.
3. Verifies the response body is exactly `{ error: "Book not found" }`.

### Example

```javascript
it('returns 404 for a non-existent UUID', async () => {
  const res = await request(app).get('/books/00000000-0000-4000-8000-000000000000');
  expect(res.status).toBe(404);
  expect(res.body).toEqual({ error: 'Book not found' });
});
```

## Acceptance Criteria

- [ ] A test case titled (or similar to) "returns 404 for a non-existent UUID" exists in `test/routes/books.view.test.js`.
- [ ] The test sends `GET /books/00000000-0000-4000-8000-000000000000`.
- [ ] The test asserts HTTP status `404`.
- [ ] The test verifies the response body is exactly `{ error: "Book not found" }`.
- [ ] The test passes when run via `npm test`.
- [ ] All prior tier tests continue to pass.

## Implementation Notes

- The UUID `00000000-0000-4000-8000-000000000000` is a valid v4-format UUID chosen specifically because it will not collide with any real seeded book ID.
- No changes to source code are required — this is a test-only task.
- The handler in `src/routes/books.js` already returns `res.status(404).json({ error: 'Book not found' })` when `book.findById()` returns `null` (implemented in #143).
- The `beforeEach` hook (from #144) seeds a separate book, but this test intentionally bypasses it by using a hard-coded non-existent UUID.

## Dependencies

- #144 — Test file and `beforeEach` setup must exist before this test can be added.

## References

- Tasks file: `plan\tasks\tasks-tier-4-view-endpoint.json`
- Tier document: `plan\tiers\tier-4-view-endpoint.md`
