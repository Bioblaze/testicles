TITLE:
Write integration test: checked_out_at is null for an available book

BODY:
## Context

As part of **Tier 4 — View Book Endpoint**, we are building out the full integration test suite for `GET /books/:id`. This task adds the seventh and final field-level assertion test, verifying that a newly seeded book (which has not been checked out) returns `checked_out_at` as `null` in the JSON response.

This confirms that the endpoint correctly serialises the database `NULL` value for the `checked_out_at` column as JSON `null`, ensuring API consumers can reliably distinguish between a book that has never been checked out and one that has.

The test belongs in `test/routes/books.view.test.js`, which already contains the shared `beforeEach` seed helper and the `describe('GET /books/:id')` block established in #144.

## Acceptance Criteria

- [ ] A new test case is added to `test/routes/books.view.test.js` inside the existing `describe('GET /books/:id')` block.
- [ ] The test seeds a book (via the shared `beforeEach` helper), sends `GET /books/:id`, and asserts that `body.checked_out_at === null`.
- [ ] The response status is `200`.
- [ ] The assertion uses strict equality (`null`, not `undefined` or falsy).
- [ ] All 7 integration tests in `books.view.test.js` pass.
- [ ] All prior tier tests continue to pass.
- [ ] CI pipeline remains green.

## Implementation Notes

### Test to add

```javascript
it('returns checked_out_at as null for an available book', async () => {
  const res = await request(app).get(`/books/${seededBook.id}`);
  expect(res.status).toBe(200);
  expect(res.body.checked_out_at).toBeNull();
});
```

### Key details

- The seeded book is created via `POST /books` in the `beforeEach` hook and defaults to `status: "available"` with `checked_out_at: null` — no special setup is required.
- Use Jest's `toBeNull()` matcher for a clear, intention-revealing assertion (equivalent to `.toBe(null)` but produces better failure messages).
- This test complements the schema-completeness test (#149) and the status-field test (#150) by narrowing in on the `checked_out_at` field specifically.

### File modified

- `test/routes/books.view.test.js` — add one `it(...)` block; no new files created.

## Dependencies

- #144 — Create test file `test/routes/books.view.test.js` with test setup (provides the describe block, seed helper, and imports)

## References

- Tasks file: `plan\tasks\tasks-tier-4-view-endpoint.json`
- Tier document: `plan\tiers\tier-4-view-endpoint.md`
