TITLE:
Initialize Node.js project and configure package.json

BODY:
## Context

This is the first task in Tier 1 (Foundation & Continuous Integration) for the `book-api` project. Before any business logic, routing, or test infrastructure can be built, the project needs a properly configured `package.json` to serve as the project manifest. All subsequent Tier 1 tasks — installing dependencies, configuring Jest, wiring CI, and implementing the health-check endpoint — depend on this initialization step.

## What needs to happen

1. Run `npm init -y` to generate a default `package.json`.
2. Set `"name"` to `"book-api"`.
3. Set `"main"` to `"src/server.js"`.
4. Configure `"scripts"`:
   - `"start"`: `"node src/server.js"` — launches the production server.
   - `"test"`: `"jest --coverage --forceExit"` — runs tests with coverage and forces Jest to exit after completion.
5. Add `"engines"`: `{ "node": ">=18.0.0" }` to enforce the minimum Node.js version.

## Acceptance Criteria

- [ ] `package.json` exists at the project root.
- [ ] `"name"` is set to `"book-api"`.
- [ ] `"main"` is set to `"src/server.js"`.
- [ ] `"scripts.start"` is `"node src/server.js"`.
- [ ] `"scripts.test"` is `"jest --coverage --forceExit"`.
- [ ] `"engines.node"` is `">=18.0.0"`.
- [ ] The file is valid JSON and can be parsed without errors.

## Implementation Notes

- Use `npm init -y` to scaffold, then manually edit or programmatically update the generated `package.json` to apply the required overrides (`name`, `main`, `scripts`, `engines`).
- The `--forceExit` flag in the test script ensures Jest terminates even when async handles (e.g., open database connections or server listeners) are not cleaned up, which is critical for CI reliability.
- The `engines` field is advisory by default; consumers can enforce it with `engine-strict=true` in `.npmrc` if desired.
- Do **not** install any dependencies in this task — that is handled by subsequent tasks.

## Dependencies

None — this is the first task in the tier.

## References

- Tasks file: `plan/tasks/tasks-tier-1-foundation.json`
- Tier document: `plan/tiers/tier-1-foundation.md`
