TITLE:
Add integration test: status field reflects 'available' for a new book

BODY:
## Context

As part of Tier 4 (View Book Endpoint), we need integration tests covering all response branches of `GET /books/:id`. This issue covers **Test #6**: verifying that the `status` field in the response body is `"available"` for a newly seeded book.

The test file `test/routes/books.view.test.js` and its `beforeEach` seeding setup were created in #144. The `GET /books/:id` route with UUID validation middleware was implemented in #142, and the handler logic that returns the full book object was implemented in #143. This task adds a targeted assertion to confirm that the default book status is correctly persisted and returned through the view endpoint.

When a book is created via `POST /books`, the database assigns a default `status` of `"available"`. This test ensures that the value survives the round-trip through the data layer and is accurately serialized in the `GET /books/:id` response — catching regressions where the default might be missing, misspelled, or overwritten.

## What to Do

In `test/routes/books.view.test.js`, add a test (`it` block) inside the existing `describe('GET /books/:id')` suite that:

1. Uses the `seededBook` created by the `beforeEach` hook (which seeds a book via `POST /books` with no explicit `status` field, relying on the database default).
2. Sends `GET /books/${seededBook.id}`.
3. Asserts the response status is `200`.
4. Asserts `body.status === "available"`.

### Example

```javascript
it('status field reflects "available" for a new book', async () => {
  const res = await request(app).get(`/books/${seededBook.id}`);
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('available');
});
```

## Acceptance Criteria

- [ ] A test case titled (or similar to) "status field reflects 'available' for a new book" exists in `test/routes/books.view.test.js`.
- [ ] The test seeds a book with no explicit status (using the `beforeEach` hook), sends `GET /books/:id`, and asserts HTTP status `200`.
- [ ] The test asserts that `body.status` is strictly equal to `"available"`.
- [ ] The test fails if the `status` field is missing, `null`, or any value other than `"available"`.
- [ ] The test passes when run via `npm test`.
- [ ] All prior tier tests continue to pass.

## Implementation Notes

- This test validates the default status value rather than structural completeness (covered by #149) or general field correctness (covered by #145). It specifically guards against regressions in the database default value for the `status` column or in the serialization of that field.
- Use a strict equality check (`toBe('available')`) rather than a truthy/existence check, so the test catches both missing values and incorrect defaults.
- No changes to source code are required — this is a test-only task.
- The `beforeEach` hook (from #144) seeds a book via `POST /books` without specifying `status`, so the database default (`"available"`) is applied automatically.
- The full book object returned by the handler includes the `status` column, as implemented in #143 via `book.findById()`.

## Dependencies

- #144 — Test file and `beforeEach` setup must exist before this test can be added.

## References

- Tasks file: `plan\tasks\tasks-tier-4-view-endpoint.json`
- Tier document: `plan\tiers\tier-4-view-endpoint.md`
