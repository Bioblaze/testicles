TITLE:
Create Swagger spec validation tests in test/docs/swagger.test.js

BODY:
## Context

As part of **Tier 7 — API Documentation & Developer Experience**, the project generates an OpenAPI 3.0 specification from `@openapi` JSDoc annotations using `swagger-jsdoc` and serves interactive docs via Swagger UI. To guarantee that documentation never drifts from the actual implementation, we need automated spec validation tests that run as part of `npm test` in CI. These tests act as a safety net: if a route is added without an annotation, if an annotation contains syntax errors, or if required metadata is missing, the build fails.

This task creates `test/docs/swagger.test.js` with 5 tests using `@apidevtools/swagger-parser` to validate the generated OpenAPI spec against the real application.

## Acceptance Criteria

- [ ] `test/docs/swagger.test.js` exists with 5 passing tests.
- [ ] **Test 1 — Generated spec is valid OpenAPI 3.0**: Load `swaggerSpec` from `src/docs/swagger.js`, validate it using `SwaggerParser.validate()`, assert validation passes without errors.
- [ ] **Test 2 — Every defined route has a path in the spec**: Compare registered Express routes from the app against `swaggerSpec.paths`, assert all routes are present in the spec.
- [ ] **Test 3 — All response codes are documented**: For each path in the spec, check that all response codes used by the actual handlers appear in the spec, assert no undocumented response codes.
- [ ] **Test 4 — Spec contains required info fields**: Check `swaggerSpec.info` has `title`, `version`, and `description`.
- [ ] **Test 5 — All paths have at least one tag**: Iterate all paths and methods in the spec, assert every operation has a `tags` array with at least one entry.
- [ ] Tests run as part of `npm test` in CI — spec validation failures block the build.
- [ ] All prior tier tests continue to pass.

## Implementation Notes

### File Location

`test/docs/swagger.test.js`

### Key Imports

- `swaggerSpec` from `src/docs/swagger.js` — the generated OpenAPI 3.0 spec object.
- `SwaggerParser` from `@apidevtools/swagger-parser` (dev dependency, installed in #172) — used to validate the spec against the OpenAPI 3.0 JSON schema.
- The Express `app` from `src/app.js` — used to extract registered routes for comparison against spec paths.

### Test Details

1. **Valid OpenAPI 3.0**: Use `await SwaggerParser.validate(swaggerSpec)` which throws if the spec is invalid. Assert it resolves without error.
2. **Every route has a path**: Extract all registered Express routes (including nested routers for `/books`, `/health`, etc.) and convert Express-style params (`:id`) to OpenAPI-style (`{id}`). Verify each route exists as a key in `swaggerSpec.paths`.
3. **All response codes documented**: For each path/method combination in the spec, verify that response codes used by the actual route handlers are present in the spec's `responses` object. This may require inspecting handler implementations or maintaining a known map of route-to-response-codes.
4. **Required info fields**: Assert `swaggerSpec.info.title` is a non-empty string, `swaggerSpec.info.version` is a non-empty string, and `swaggerSpec.info.description` is a non-empty string.
5. **All paths have tags**: Iterate over `Object.keys(swaggerSpec.paths)`, then for each path iterate over HTTP methods. For each operation object, assert `operation.tags` is an array with `length >= 1`.

### CI Integration

No additional CI configuration is needed. The existing `.github/workflows/ci.yml` runs `npm test`, which will automatically execute `swagger.test.js`. A failing spec validation test blocks the build, ensuring documentation stays in sync with the implementation.

## Dependencies

- #172 — Install runtime and dev dependencies (provides `@apidevtools/swagger-parser`)
- #179 — Integrate Swagger UI and JSON spec endpoint into `src/app.js` (provides the mounted spec and app structure)

## References

- Tasks file: `plan\tasks\tasks-tier-7-documentation-history.json`
- Tier document: `plan\tiers\tier-7-documentation-history.md`
