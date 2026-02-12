TITLE:
Install dev dependencies (jest, supertest)

BODY:
## Context

This is part of **Tier 1: Foundation & Continuous Integration**, which establishes the Node.js project skeleton, installs core dependencies, configures the test runner, and wires a CI pipeline before any business logic is introduced.

The project requires `jest` (test runner and assertion library) and `supertest` (HTTP assertion library for integration tests) as development dependencies. These packages enable the test-driven workflow used throughout the project — `supertest` binds to the Express app on an ephemeral port so integration tests can run without starting a real server, and `jest` provides the runner, assertions, and coverage reporting.

This task must be completed after the project has been initialized (#104), since `npm install --save-dev` requires an existing `package.json`.

## Implementation Notes

Run the following command from the project root:

```bash
npm install --save-dev jest supertest
```

This will:
- Add `jest` and `supertest` to `devDependencies` in `package.json`
- Update `package-lock.json` with the resolved dependency tree
- Install both packages (and their transitive dependencies) into `node_modules/`

### Version Strategy

Both packages use the **latest** version strategy as defined in the tier document:

| Package | Purpose |
|---|---|
| `jest` | Test runner and assertion library |
| `supertest` | HTTP assertion library for integration tests |

### Why `--save-dev`?

These are testing tools that are not needed at runtime. Installing them as dev dependencies keeps the production `node_modules` lean (e.g., when using `npm ci --omit=dev` in a production Docker image).

## Acceptance Criteria

- [ ] `jest` is listed under `devDependencies` in `package.json`
- [ ] `supertest` is listed under `devDependencies` in `package.json`
- [ ] `package-lock.json` is updated and includes both packages
- [ ] Running `npx jest --version` prints the installed Jest version without error
- [ ] `node_modules/jest` and `node_modules/supertest` directories exist after install

## Dependencies

- #104 — Initialize Node.js project and configure `package.json` (must be completed first)

## References

- Tasks file: `plan/tasks/tasks-tier-1-foundation.json`
- Tier document: `plan/tiers/tier-1-foundation.md`
