TITLE:
Create Jest configuration (jest.config.js)

BODY:
## Context

As part of [Tier 1: Foundation & Continuous Integration](plan/tiers/tier-1-foundation.md), we need to configure Jest so that the test runner is properly set up before writing any tests. This configuration file defines the test environment, test file locations, coverage output, coverage exclusions, and minimum coverage thresholds for the project.

The `jest.config.js` file is a prerequisite for the integration tests (`test/health.test.js`) and for verifying that coverage meets project standards. Without it, `npm test` will not know where to find tests or how to enforce coverage requirements.

## Acceptance Criteria

- [ ] `jest.config.js` exists at the project root.
- [ ] `testEnvironment` is set to `'node'` (tests run in a Node.js environment, not jsdom).
- [ ] `roots` is set to `['<rootDir>/test']`, pointing Jest to the `test/` directory.
- [ ] `coverageDirectory` is set to `'coverage'`.
- [ ] `coveragePathIgnorePatterns` excludes `/node_modules/` and `src/server.js` from coverage reports.
- [ ] `coverageThreshold` enforces a global minimum of 80% for all four metrics: statements, branches, functions, and lines.
- [ ] Running `npx jest --showConfig` confirms the configuration is loaded correctly.

## Implementation Notes

Create `jest.config.js` at the project root with the following content:

```javascript
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', 'src/server.js'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};
```

### Key configuration choices

- **`testEnvironment: 'node'`** — The project is a Node.js/Express API; there is no browser DOM to simulate.
- **`roots: ['<rootDir>/test']`** — All test files live under the `test/` directory. This keeps Jest from scanning `src/` or `node_modules/` for test files.
- **`coveragePathIgnorePatterns`** — `src/server.js` is the production entry point that calls `app.listen()`. It is excluded from coverage because it cannot be meaningfully tested via supertest (which binds the app to an ephemeral port directly).
- **`coverageThreshold` at 80%** — Establishes a baseline quality gate. The CI pipeline (`npm test` runs `jest --coverage --forceExit`) will fail if coverage drops below this threshold.

## Dependencies

- #106 — Jest and supertest must be installed as dev dependencies before this configuration is meaningful.

## References

- Tasks file: `plan/tasks/tasks-tier-1-foundation.json`
- Tier document: `plan/tiers/tier-1-foundation.md`
