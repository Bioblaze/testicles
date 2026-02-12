TITLE:
Add integration test: GET /books/:id returns 400 for a numeric ID

BODY:
## Context

As part of Tier 4 (View Book Endpoint), we need integration tests covering all response branches of `GET /books/:id`. This issue covers **Test #4**: verifying that requesting a purely numeric ID (e.g., `12345`) returns `400` with a structured validation error body.

The test file `test/routes/books.view.test.js` and its `beforeEach` seeding setup were created in #144. The `GET /books/:id` route with UUID validation middleware (`param('id').isUUID(4)`) and the shared `validate` middleware were implemented in #142 and #143. This task adds the 400 bad-request test case for a numeric (non-UUID) ID to the existing suite.

## What to Do

In `test/routes/books.view.test.js`, add a test (`it` block) inside the existing `describe('GET /books/:id')` suite that:

1. Sends `GET /books/12345` — a numeric string that is not a valid UUID v4.
2. Asserts the response status is `400`.
3. Verifies the response body contains `errors` as an array that includes at least one object with `{ field: "id" }` and a `message` property.

### Example

```javascript
it('returns 400 for a numeric ID', async () => {
  const res = await request(app).get('/books/12345');
  expect(res.status).toBe(400);
  expect(res.body.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ field: 'id' }),
    ])
  );
});
```

## Acceptance Criteria

- [ ] A test case titled (or similar to) "returns 400 for a numeric ID" exists in `test/routes/books.view.test.js`.
- [ ] The test sends `GET /books/12345`.
- [ ] The test asserts HTTP status `400`.
- [ ] The test verifies the response body has an `errors` array containing at least one entry with `field: "id"` and a `message` property.
- [ ] The test passes when run via `npm test`.
- [ ] All prior tier tests continue to pass.

## Implementation Notes

- The value `12345` is intentionally chosen as a purely numeric string to confirm that the `param('id').isUUID(4)` validation (added in #142) rejects non-UUID formats, not just alphabetic garbage — numeric IDs are a common real-world mistake (e.g., auto-increment integer IDs from other systems).
- No changes to source code are required — this is a test-only task.
- The shared `validate` middleware (from `src/middleware/validate.js`) returns the structured `{ errors: [{ field, message }] }` response when validation fails, so the test should assert against that shape.
- The `beforeEach` hook (from #144) seeds a book, but this test does not depend on the seeded book since it exercises the validation rejection path before any database lookup occurs.

## Dependencies

- #144 — Test file and `beforeEach` setup must exist before this test can be added.

## References

- Tasks file: `plan\tasks\tasks-tier-4-view-endpoint.json`
- Tier document: `plan\tiers\tier-4-view-endpoint.md`
