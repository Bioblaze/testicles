TITLE:
Verify all 17 integration tests pass and Tier 1/Tier 2 tests remain green

BODY:
## Context

Tier 3 adds two RESTful endpoints — `POST /books` (create) and `GET /books` (list) — along with validation middleware, route wiring, and 17 new integration tests (9 for `POST /books` in `test/routes/books.create.test.js`, 8 for `GET /books` in `test/routes/books.list.test.js`).

This issue is the final verification gate for Tier 3. Its purpose is to run the full test suite (`npm test`), confirm that all 17 new integration tests pass, all existing Tier 1 and Tier 2 tests remain green, coverage thresholds are met, and the CI pipeline stays healthy. No new code is written here — this is a validation and sign-off task.

## Acceptance Criteria

- [ ] Running `npm test` completes successfully with a zero exit code.
- [ ] All 9 `POST /books` integration tests pass (`test/routes/books.create.test.js`):
  - Valid payload creates a book (201).
  - Missing `title` returns 400 with structured error.
  - Missing `author` returns 400 with structured error.
  - Invalid ISBN format returns 400.
  - `published_year` below 1000 returns 400.
  - `published_year` in the future returns 400.
  - Empty body returns 400 with errors for all four required fields.
  - Duplicate ISBN returns 409 conflict.
  - Response includes expected default fields (`id`, `created_at`, `updated_at`, `status: "available"`, `checked_out_at: null`).
- [ ] All 8 `GET /books` integration tests pass (`test/routes/books.list.test.js`):
  - Empty database returns `{ data: [], pagination: { page: 1, limit: 20, total: 0 } }`.
  - Seeded books return correct count and pagination total.
  - Pagination defaults are applied when no query params are provided.
  - Custom `page` and `limit` values work correctly.
  - `limit` is capped at 100.
  - Response shape includes `data` (array) and `pagination` (object).
  - Invalid `page` falls back to default.
  - Invalid `limit` falls back to default.
- [ ] All pre-existing Tier 1 tests continue to pass.
- [ ] All pre-existing Tier 2 tests continue to pass.
- [ ] Code coverage thresholds are met (no regression in coverage).
- [ ] CI pipeline remains green with no new warnings or failures.

## Implementation Notes

- This task involves no code changes — it is strictly a test execution and verification step.
- Run `npm test` in a clean environment to ensure there are no stale artifacts influencing results.
- If any tests fail, do **not** close this issue. Instead, identify the failing test(s), trace the root cause back to the relevant Tier 3 implementation task (#133–#140), and resolve the issue there before re-running.
- Pay attention to test isolation: the in-memory SQLite database (`NODE_ENV=test`) should ensure each test file starts with a clean state. Verify there are no cross-test side effects.
- Confirm that `express-validator` is properly installed and listed in `package.json` — a missing dependency would cause import failures across multiple test files.
- If coverage thresholds are configured (e.g., via Jest `coverageThreshold`), ensure the new test files contribute positively and no existing coverage is regressed.

## Dependencies

- #139 — Write integration tests for POST /books (`test/routes/books.create.test.js`)
- #140 — Write integration tests for GET /books (`test/routes/books.list.test.js`)

## References

- Tasks file: `plan\tasks\tasks-tier-3-create-list-endpoints.json`
- Tier document: `plan\tiers\tier-3-create-list-endpoints.md`
