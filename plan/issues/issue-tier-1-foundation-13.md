TITLE:
Create GitHub Actions CI workflow (.github/workflows/ci.yml)

BODY:
## Context

This is the final task in Tier 1 (Foundation & Continuous Integration). All source code, tests, and local verification are complete. The remaining piece is to wire a GitHub Actions CI pipeline so that every push and pull request targeting `main` is automatically built and tested across supported Node.js LTS versions.

The workflow lives at `.github/workflows/ci.yml` and must exercise the full `npm ci` → `npm test` loop in a matrix build, ensuring the project stays green on both Node.js 18.x and 20.x. Coverage artifacts are uploaded on every run (including failures) to aid debugging.

## Acceptance Criteria

- [ ] `.github/workflows/ci.yml` exists and is valid YAML.
- [ ] Workflow triggers on `push` to `main` and `pull_request` targeting `main`.
- [ ] Matrix strategy runs against Node.js **18.x** and **20.x**.
- [ ] Each matrix entry performs: checkout → setup Node.js (with npm cache) → `npm ci` → `npm test`.
- [ ] Coverage directory is uploaded as an artifact named `coverage-node-<version>` using `actions/upload-artifact@v4`, with `if: always()` so it uploads even on failure.
- [ ] CI pipeline passes on both matrix entries when pushed to `main`.

## Implementation Notes

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm test

      - name: Upload coverage artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-node-${{ matrix.node-version }}
          path: coverage/
```

### Key decisions

- **`npm ci`** over `npm install`: deterministic installs from `package-lock.json`, faster in CI.
- **`cache: 'npm'`** in `actions/setup-node@v4`: caches the global npm cache directory to speed up repeated installs.
- **`if: always()`** on the upload step: ensures coverage artifacts are available for debugging even when tests fail.
- **`--forceExit`** (configured in `package.json` test script): prevents Jest from hanging on unclosed async handles.

## Dependencies

- #109 — Create project directory structure (provides `.github/workflows/` directory)
- #115 — Verify tests pass locally and coverage meets thresholds (confirms the test suite is green before wiring CI)

## References

- Tasks file: `plan\tasks\tasks-tier-1-foundation.json`
- Tier document: `plan\tiers\tier-1-foundation.md`
