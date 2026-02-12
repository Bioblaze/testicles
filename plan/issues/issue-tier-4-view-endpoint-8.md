TITLE:
Add integration test: GET /books/:id response body contains all book schema fields

BODY:
## Context

As part of Tier 4 (View Book Endpoint), we need integration tests covering all response branches of `GET /books/:id`. This issue covers **Test #5**: verifying that the `200` response body for an existing book contains every field defined in the book schema.

The test file `test/routes/books.view.test.js` and its `beforeEach` seeding setup were created in #144. The `GET /books/:id` route with UUID validation middleware and the handler logic that returns the full book object were implemented in #142 and #143. This task adds a schema-completeness assertion to the existing suite, ensuring that no fields are accidentally omitted from the response.

The book schema defines the following nine fields: `id`, `title`, `author`, `isbn`, `published_year`, `status`, `checked_out_at`, `created_at`, `updated_at`. The test must confirm that **all** of these keys are present in the response body — not just that the response is `200`.

## What to Do

In `test/routes/books.view.test.js`, add a test (`it` block) inside the existing `describe('GET /books/:id')` suite that:

1. Uses the `seededBook` created by the `beforeEach` hook (which seeds a book via `POST /books`).
2. Sends `GET /books/${seededBook.id}`.
3. Asserts the response status is `200`.
4. Verifies the response body contains **every** field defined in the book schema: `id`, `title`, `author`, `isbn`, `published_year`, `status`, `checked_out_at`, `created_at`, `updated_at`.

### Example

```javascript
it('response body contains all book schema fields', async () => {
  const res = await request(app).get(`/books/${seededBook.id}`);
  expect(res.status).toBe(200);

  const expectedFields = [
    'id',
    'title',
    'author',
    'isbn',
    'published_year',
    'status',
    'checked_out_at',
    'created_at',
    'updated_at',
  ];

  expectedFields.forEach((field) => {
    expect(res.body).toHaveProperty(field);
  });
});
```

## Acceptance Criteria

- [ ] A test case titled (or similar to) "response body contains all book schema fields" exists in `test/routes/books.view.test.js`.
- [ ] The test seeds a book, sends `GET /books/:id`, and asserts HTTP status `200`.
- [ ] The test verifies the response body has all nine book schema fields: `id`, `title`, `author`, `isbn`, `published_year`, `status`, `checked_out_at`, `created_at`, `updated_at`.
- [ ] The test fails if any field is missing from the response body.
- [ ] The test passes when run via `npm test`.
- [ ] All prior tier tests continue to pass.

## Implementation Notes

- This test validates structural completeness rather than correctness of individual field values. Other tests (e.g., #145) already assert that specific field values match the seeded data, and later tests assert `status` and `checked_out_at` values. This test ensures no fields are accidentally dropped from the query or serialization layer.
- Use `toHaveProperty` (or equivalent) for each field rather than checking `Object.keys()` length, so that a clear error message identifies exactly which field is missing if the test fails.
- No changes to source code are required — this is a test-only task.
- The `beforeEach` hook (from #144) seeds a book via `POST /books`, so `seededBook.id` is available for the `GET` request.
- The full book object returned by the handler includes all columns from the `books` table, as implemented in #143 via `book.findById()`.

## Dependencies

- #144 — Test file and `beforeEach` setup must exist before this test can be added.

## References

- Tasks file: `plan\tasks\tasks-tier-4-view-endpoint.json`
- Tier document: `plan\tiers\tier-4-view-endpoint.md`
