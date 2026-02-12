TITLE:
Verify tests pass locally and coverage meets thresholds

BODY:
## Context

This task is the local verification gate for the Tier 1 foundation work. All source files (`src/app.js`, `src/routes/health.js`, `src/server.js`), the Jest configuration (`jest.config.js`), and the integration tests (`test/health.test.js`) have been implemented in prior issues. Before wiring the CI pipeline, we need to confirm that the test suite runs successfully on a developer machine and that code coverage meets the project's quality bar.

This is part of **Tier 1: Foundation & Continuous Integration**, whose objective is to prove the full build-test-deploy loop works end-to-end before any business logic is introduced.

## Acceptance Criteria

- [ ] `npm test` executes successfully and all 3 test cases pass:
  1. `GET /health` returns `200` with `{ status: "ok" }`
  2. `GET /health` returns `application/json` content type
  3. `GET /nonexistent` returns `404` with `{ error: "Not found" }`
- [ ] Jest generates a coverage report in the `coverage/` directory
- [ ] All four coverage metrics meet the 80% global threshold:
  - Statements ≥ 80%
  - Branches ≥ 80%
  - Functions ≥ 80%
  - Lines ≥ 80%
- [ ] `src/server.js` is excluded from the coverage report (confirmed via `coveragePathIgnorePatterns` in `jest.config.js`)
- [ ] Jest exits cleanly (via `--forceExit` flag configured in the `test` script)

## Implementation Notes

1. **Run the test suite**: Execute `npm test`, which resolves to `jest --coverage --forceExit`.
2. **Inspect test output**: Confirm the console shows 3 passing tests across two `describe` blocks (`GET /health` and `Unknown routes`).
3. **Review coverage table**: Jest prints a coverage summary table to stdout. Verify each metric (statements, branches, functions, lines) is at or above 80%. If any metric falls below the threshold, Jest will exit with a non-zero code and the task fails.
4. **Confirm server exclusion**: Check that `src/server.js` does not appear in the coverage table. This is controlled by `coveragePathIgnorePatterns` in `jest.config.js`, which should contain `'src/server.js'`.
5. **Verify coverage artifacts**: Confirm the `coverage/` directory is created and contains the report files (e.g., `lcov-report/`, `clover.xml`, `coverage-final.json`).

If tests fail or coverage is below threshold, investigate and resolve before marking this issue complete. Do **not** lower thresholds to pass.

## Dependencies

- #114 — Write integration tests for health endpoint and 404 handling (`test/health.test.js`)

## References

- Tasks file: `plan\tasks\tasks-tier-1-foundation.json`
- Tier document: `plan\tiers\tier-1-foundation.md`
