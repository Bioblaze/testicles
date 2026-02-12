TITLE:
Install production dependencies (express, dotenv)

BODY:
## Context

This is part of **Tier 1: Foundation & Continuous Integration**, which stands up the Node.js project skeleton, installs core dependencies, and proves the build-test-deploy loop end-to-end before any business logic is introduced.

Before any application code can be written, the project needs its core production packages installed. `express` provides the HTTP framework for routing and middleware, while `dotenv` loads environment variables from a `.env` file into `process.env` at runtime. Both are required by downstream tasks that implement the Express app factory (`src/app.js`) and the production server entry point (`src/server.js`).

## Acceptance Criteria

- [ ] `express` is listed under `dependencies` in `package.json`
- [ ] `dotenv` is listed under `dependencies` in `package.json`
- [ ] Both packages are installed at their latest versions
- [ ] `package-lock.json` is generated/updated and committed
- [ ] `node_modules/` is **not** committed (covered by `.gitignore`)
- [ ] `npm install` completes without errors or peer-dependency warnings

## Implementation Notes

Run the following command from the project root:

```bash
npm install express dotenv
```

This adds both packages as production dependencies. Verify the result by checking that `package.json` contains entries for both packages under `"dependencies"` and that `package-lock.json` reflects the installed versions.

### Why these packages?

| Package  | Purpose |
|----------|---------|
| `express` | HTTP framework for routing and middleware — used by `src/app.js` and all route modules |
| `dotenv`  | Loads `.env` variables into `process.env` — used by `src/server.js` at startup |

## Dependencies

- #104 — Initialize Node.js project and configure `package.json` (must be completed first so that `package.json` exists)

## References

- Tasks file: `plan\tasks\tasks-tier-1-foundation.json`
- Tier document: `plan\tiers\tier-1-foundation.md`
