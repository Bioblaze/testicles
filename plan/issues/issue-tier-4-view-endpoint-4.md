TITLE:
Add integration test: GET /books/:id returns 200 with correct book for valid existing ID

BODY:
## Context

As part of Tier 4 (View Book Endpoint), we need integration tests covering all response branches of `GET /books/:id`. This issue covers **Test #1**: verifying that requesting a valid, existing book ID returns `200` with the correct book data.

The test file `test/routes/books.view.test.js` and its `beforeEach` seeding setup were created in #144. This task adds the first concrete test case to that file.

## What to Do

In `test/routes/books.view.test.js`, add a test (`it` block) inside the existing `describe('GET /books/:id')` suite that:

1. Uses the `seededBook` created by the `beforeEach` hook (which POSTs a book to `/books`).
2. Sends `GET /books/<seededBook.id>`.
3. Asserts the response status is `200`.
4. Verifies the response body matches the seeded book's data — at minimum `id`, `title`, and `author`.

### Example

```javascript
it('returns 200 with the correct book', async () => {
  const res = await request(app).get(`/books/${seededBook.id}`);
  expect(res.status).toBe(200);
  expect(res.body.id).toBe(seededBook.id);
  expect(res.body.title).toBe('Test Book');
  expect(res.body.author).toBe('Test Author');
});
```

## Acceptance Criteria

- [ ] A test case titled (or similar to) "returns 200 with the correct book" exists in `test/routes/books.view.test.js`.
- [ ] The test seeds a book via the `beforeEach` hook, then sends `GET /books/:seededId`.
- [ ] The test asserts HTTP status `200`.
- [ ] The test verifies the response body's `id`, `title`, and `author` match the seeded book.
- [ ] The test passes when run via `npm test`.
- [ ] All prior tier tests continue to pass.

## Implementation Notes

- The `beforeEach` hook (from #144) already seeds a book with `title: 'Test Book'`, `author: 'Test Author'`, `isbn: '978-3-16-148410-0'`, `published_year: 2023` and stores the response in `seededBook`.
- No changes to source code are required — this is a test-only task.
- The `GET /books/:id` route and handler logic were implemented in #142 and #143.

## Dependencies

- #144 — Test file and `beforeEach` setup must exist before this test can be added.

## References

- Tasks file: `plan\tasks\tasks-tier-4-view-endpoint.json`
- Tier document: `plan\tiers\tier-4-view-endpoint.md`
