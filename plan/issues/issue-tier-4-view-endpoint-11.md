TITLE:
Run full test suite and verify all Tier 4 (View Book) tests pass

BODY:
## Context

Tier 4 implements the `GET /books/:id` endpoint — retrieving a single book by UUID, validating the path parameter, and handling the not-found case with a proper JSON response. All implementation and integration test tasks for this tier are now complete. This final task runs the full test suite to confirm that every new and existing test passes and the CI pipeline remains green.

Seven new integration tests were added in `test/routes/books.view.test.js` covering:
- 200 response for a valid existing ID
- 404 response for a valid UUID that does not exist
- 400 response for a malformed (non-UUID) ID
- 400 response for a numeric ID
- Response body contains all book schema fields
- `status` field reflects `"available"` for a new book
- `checked_out_at` is `null` for an available book

## Acceptance Criteria

- [ ] `npm test` exits with code 0.
- [ ] All 7 new integration tests in `books.view.test.js` pass.
- [ ] All prior tier tests (Tier 1, Tier 2, Tier 3) continue to pass — no regressions.
- [ ] No unhandled exceptions are thrown for any input — all code paths return structured JSON.
- [ ] The CI pipeline remains green after merging.

## Implementation Notes

1. Run `npm test` from the project root.
2. Confirm the test output shows all 7 `GET /books/:id` tests passing (look for the `describe('GET /books/:id', ...)` block).
3. Verify that no other test suites have new failures — the Tier 4 route and tests must not break existing behaviour.
4. If any test fails, investigate and fix the root cause before marking this task complete.
5. Confirm the CI pipeline (GitHub Actions or equivalent) reports a green status on the branch/PR.

## Dependencies

This task depends on all Tier 4 integration test tasks being complete:

- #145 — Integration test: returns 200 with the correct book for a valid existing ID
- #146 — Integration test: returns 404 for a valid UUID that does not exist
- #147 — Integration test: returns 400 for a malformed (non-UUID) ID
- #148 — Integration test: returns 400 for a numeric ID
- #149 — Integration test: response body contains all book schema fields
- #150 — Integration test: status field reflects "available" for a new book
- #151 — Integration test: checked_out_at is null for an available book

## References

- Tasks file: `plan\tasks\tasks-tier-4-view-endpoint.json`
- Tier document: `plan\tiers\tier-4-view-endpoint.md`
