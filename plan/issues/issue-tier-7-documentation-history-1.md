TITLE:
Install runtime and dev dependencies for Swagger and spec validation (swagger-ui-express, swagger-jsdoc, @apidevtools/swagger-parser)

BODY:
## Context

This is the first task in Tier 7 (API Documentation & Developer Experience) for the `book-api` project. Before the OpenAPI spec generation, Swagger UI serving, or spec validation tests can be implemented, the necessary npm packages must be installed. This task adds two runtime dependencies — `swagger-ui-express` (serves interactive Swagger UI as Express middleware at `/docs`) and `swagger-jsdoc` (generates an OpenAPI 3.0 specification object from JSDoc `@openapi` annotations found in source files) — plus one dev dependency, `@apidevtools/swagger-parser`, which validates that the generated OpenAPI spec conforms to the OpenAPI 3.0 JSON schema and is used in the spec validation test suite (`test/docs/swagger.test.js`). These packages are prerequisites for the OpenAPI spec config (`src/docs/swagger.js`), the Swagger UI integration in `src/app.js`, the `@openapi` route annotations, and the spec validation tests.

## What needs to happen

1. Install the two runtime dependencies:
   ```bash
   npm install swagger-ui-express swagger-jsdoc
   ```
2. Install the dev dependency for OpenAPI spec validation in tests:
   ```bash
   npm install --save-dev @apidevtools/swagger-parser
   ```
3. Verify that `package.json` lists:
   - `swagger-ui-express` under `dependencies`
   - `swagger-jsdoc` under `dependencies`
   - `@apidevtools/swagger-parser` under `devDependencies`
4. Verify `package-lock.json` has been updated and all three packages resolve correctly.
5. Run `npm test` to confirm all existing tests from prior tiers continue to pass with the new packages installed.

## Acceptance Criteria

- [ ] `swagger-ui-express` is listed in `package.json` under `dependencies`.
- [ ] `swagger-jsdoc` is listed in `package.json` under `dependencies`.
- [ ] `@apidevtools/swagger-parser` is listed in `package.json` under `devDependencies`.
- [ ] `package-lock.json` is updated with all three packages resolved.
- [ ] `npm install` completes without errors or peer dependency warnings.
- [ ] All prior tier tests (Tier 1 through Tier 6) continue to pass after installation.
- [ ] CI pipeline remains green.

## Implementation Notes

- **Version strategy**: All packages should be installed at their latest versions. No version pinning is required at this stage; the lockfile will capture the resolved versions.
- **`swagger-ui-express`** serves the Swagger UI static assets as Express middleware. It will be mounted at `/docs` in `src/app.js` (configured in a later task) to provide an interactive, browser-based interface for exploring and testing every API endpoint.
- **`swagger-jsdoc`** scans source files (configured via an `apis` glob, e.g., `['./src/routes/*.js']`) for `@openapi` JSDoc annotation blocks and assembles them into a complete OpenAPI 3.0 specification object. This makes the route annotations the single source of truth for the API documentation.
- **`@apidevtools/swagger-parser`** is a dev-only dependency used in `test/docs/swagger.test.js` to validate the generated OpenAPI spec against the official OpenAPI 3.0 JSON schema. Its `SwaggerParser.validate()` method ensures the spec is syntactically and semantically correct. By running these validation tests as part of `npm test` in CI, documentation can never drift from the implementation — missing or malformed annotations will fail the build.
- This task only installs packages — no source code changes are made. All spec generation, UI mounting, route annotations, and validation tests happen in subsequent Tier 7 tasks.

## Dependencies

None — this is the first task in Tier 7 and has no dependency on other Tier 7 tasks.

## References

- Tasks file: `plan/tasks/tasks-tier-7-documentation-history.json`
- Tier document: `plan/tiers/tier-7-documentation-history.md`
