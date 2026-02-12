# Tier 1: Foundation & Continuous Integration

---

## Objective

Stand up the Node.js project skeleton, install core dependencies, configure the test runner, wire a GitHub Actions CI pipeline, and expose a single health-check endpoint — proving the full build-test-deploy loop works end-to-end before any business logic is introduced.

---

## Dependencies

| Package | Version Strategy | Purpose |
|---|---|---|
| `express` | latest | HTTP framework for routing and middleware |
| `jest` | latest | Test runner and assertion library |
| `supertest` | latest | HTTP assertion library for integration tests |
| `dotenv` | latest | Loads environment variables from `.env` into `process.env` |

Install commands:

```bash
npm init -y
npm install express dotenv
npm install --save-dev jest supertest
```

---

## Project Structure

```
book-api/
├── src/
│   ├── app.js                  # Express app factory (does NOT call .listen())
│   ├── server.js               # Production entry point (imports app, calls .listen())
│   └── routes/
│       └── health.js           # GET /health route module
├── test/
│   └── health.test.js          # Integration tests for the health endpoint
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
├── .env.example                # Template for required environment variables
├── .gitignore                  # Node.js gitignore (node_modules, coverage, .env, etc.)
├── jest.config.js              # Jest configuration
└── package.json                # Project manifest with scripts
```

---

## File-by-File Implementation Details

### `package.json`

- **`name`**: `book-api`
- **`main`**: `src/server.js`
- **`scripts`**:
  - `"start"`: `"node src/server.js"` — launches the production server.
  - `"test"`: `"jest --coverage --forceExit"` — runs tests with coverage and forces exit after completion.
- **`engines`**: `{ "node": ">=18.0.0" }` — enforces minimum Node.js version.

### `src/app.js` — Express Application Factory

- Import `express`.
- Create a new Express application instance.
- Mount `express.json()` middleware for JSON body parsing.
- Mount the health route module at the root path.
- Add a catch-all middleware that returns `404 Not Found` with `{ error: "Not found" }` for any unmatched route.
- Export the app instance **without** calling `.listen()`.

**Why the factory pattern?** Separating the app from the server allows `supertest` to bind the Express app to an ephemeral port during tests, avoiding port conflicts and enabling parallel test execution.

### `src/server.js` — Production Entry Point

- Load `dotenv/config` to read `.env` variables.
- Import the app from `./app.js`.
- Read `PORT` from `process.env`, defaulting to `3000`.
- Call `app.listen(PORT)` and log a startup message to stdout.
- This file is **excluded** from test coverage (configured in `jest.config.js`).

### `src/routes/health.js` — Health Check Route

- Create an Express `Router` instance.
- Define `GET /health`:
  - Response status: `200`.
  - Response body: `{ "status": "ok" }`.
  - Content-Type: `application/json`.
- Export the router.

**Purpose**: Provides a minimal smoke-test surface for CI. If this endpoint responds, the Express app is booting correctly.

### `jest.config.js` — Jest Configuration

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

- **`testEnvironment`**: `node` — tests run in a Node.js environment (not jsdom).
- **`roots`**: Points Jest to the `test/` directory.
- **`coveragePathIgnorePatterns`**: Excludes `node_modules` and the server entry point from coverage.
- **`coverageThreshold`**: All four metrics (statements, branches, functions, lines) must meet 80%.

### `.env.example` — Environment Variable Template

```
PORT=3000
NODE_ENV=development
```

Developers copy this to `.env` for local development. The `.env` file itself is git-ignored.

### `.gitignore`

```
node_modules/
coverage/
.env
*.db
```

---

## GitHub Actions CI Workflow

### `.github/workflows/ci.yml`

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

**Workflow behavior**:

1. **Triggers**: On every `push` to `main` and every `pull_request` targeting `main`.
2. **Matrix**: Tests against Node.js 18.x and 20.x to ensure LTS compatibility.
3. **`npm ci`**: Deterministic install from `package-lock.json`. Faster and more reliable than `npm install` in CI.
4. **`npm test`**: Runs `jest --coverage --forceExit`. The `--forceExit` flag ensures Jest exits even if async handles are not cleaned up.
5. **Coverage artifact**: Uploaded after every run (even on failure) for debugging.

The pipeline **must pass** before any PR is merged.

---

## Tests

### `test/health.test.js`

All tests use `supertest` to make HTTP requests against the Express app without starting a real server.

| # | Test Case | Method & Path | Expected Status | Expected Body / Header |
|---|---|---|---|---|
| 1 | Health endpoint returns 200 with status ok | `GET /health` | `200` | `{ status: "ok" }` |
| 2 | Health endpoint returns JSON content type | `GET /health` | `200` | `Content-Type` header contains `application/json` |
| 3 | Unknown route returns 404 | `GET /nonexistent` | `404` | `{ error: "Not found" }` |

**Test structure**:

```javascript
const request = require('supertest');
const app = require('../src/app');

describe('GET /health', () => {
  it('returns 200 with { status: "ok" }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns application/json content type', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

describe('Unknown routes', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});
```

---

## Acceptance Criteria

- [ ] `npm test` passes locally with all 3 test cases green.
- [ ] Jest coverage report is generated and meets the 80% threshold on all four metrics.
- [ ] GitHub Actions workflow file exists at `.github/workflows/ci.yml`.
- [ ] CI pipeline succeeds on push (both Node.js 18.x and 20.x matrix entries).
- [ ] `GET /health` returns `200` with `{ "status": "ok" }`.
- [ ] Unmatched routes return `404` with a JSON error body.
- [ ] `src/server.js` is excluded from coverage.
- [ ] `.env` and `node_modules/` are git-ignored.
