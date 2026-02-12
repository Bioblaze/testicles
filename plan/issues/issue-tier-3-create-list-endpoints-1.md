TITLE:
Install express-validator dependency

BODY:
## Context

This is the first task in Tier 3 (Create Book & List Books Endpoints) for the `book-api` project. Before the validation middleware, book routes, or integration tests can be implemented, the `express-validator` package must be installed. This library provides declarative request validation and sanitization chains for Express, and is used throughout Tier 3 to validate incoming request bodies and query parameters for the `POST /books` and `GET /books` endpoints. Tasks 3–9 in this tier depend on this package being available.

## What needs to happen

1. Run `npm install express-validator` to add the package as a production dependency.
2. Verify that `express-validator` appears in the `dependencies` section of `package.json`.
3. Confirm the package resolves correctly (e.g., `require('express-validator')` does not throw).

## Acceptance Criteria

- [ ] `express-validator` is listed under `dependencies` in `package.json`.
- [ ] `package-lock.json` is updated to reflect the new dependency.
- [ ] `node_modules/` contains the installed package.
- [ ] The package can be required/imported without errors.
- [ ] Existing Tier 1 and Tier 2 tests continue to pass (`npm test` remains green).

## Implementation Notes

- Use `npm install express-validator` (without `--save-dev`) so the package lands in `dependencies`, not `devDependencies`. This is a runtime requirement for request validation middleware.
- Version strategy is **latest**, per the tier document. The lock file will pin the exact version installed.
- Do **not** implement any source files in this task — the validation middleware (`src/middleware/validate.js`), book routes (`src/routes/books.js`), app modifications, and integration tests are handled by subsequent tasks.

## Dependencies

None — this is the first task in the tier and has no dependency on other Tier 3 tasks.

## References

- Tasks file: `plan/tasks/tasks-tier-3-create-list-endpoints.json`
- Tier document: `plan/tiers/tier-3-create-list-endpoints.md`
