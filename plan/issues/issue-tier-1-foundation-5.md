TITLE:
Create .env.example environment variable template

BODY:
## Context

This is part of **Tier 1: Foundation & Continuous Integration**, which establishes the Node.js project skeleton, installs core dependencies, configures the test runner, and wires a CI pipeline before any business logic is introduced.

A `.env.example` file serves as the canonical reference for all required environment variables in the project. Developers clone the repository and copy this file to `.env` for local development. Without a checked-in template, new contributors have no way to discover which variables are needed, what format they take, or what sensible defaults look like — leading to failed startups and unnecessary onboarding friction.

The production entry point (`src/server.js`) uses `dotenv` to load variables from `.env` into `process.env`. The `.env` file itself is git-ignored (see `.gitignore`), so `.env.example` is the only version-controlled record of the project's environment contract.

## Implementation Notes

Create a `.env.example` file at the project root with the following contents:

```
PORT=3000
NODE_ENV=development
```

### Variable Reference

| Variable | Default Value | Purpose |
|---|---|---|
| `PORT` | `3000` | The port on which the Express server listens. Read by `src/server.js` via `process.env.PORT` with a fallback to `3000`. |
| `NODE_ENV` | `development` | The runtime environment identifier. Common values: `development`, `production`, `test`. Used by Express and other libraries to toggle behavior (e.g., error verbosity, performance optimizations). |

### Notes

- This task has **no dependencies** on other tasks and can be completed at any time.
- The file should **not** contain actual secrets — only placeholder/default values suitable for local development.
- `.env.example` must **not** be listed in `.gitignore`; it is intentionally committed to the repository so all developers have access to the template.
- Future tiers may introduce additional environment variables (e.g., database connection strings); they should be appended to this file as needed.
- Developers should copy the file (`cp .env.example .env`) and adjust values for their local setup before starting the server.

## Acceptance Criteria

- [ ] `.env.example` file exists at the project root
- [ ] File contains `PORT=3000`
- [ ] File contains `NODE_ENV=development`
- [ ] File does **not** contain any real secrets or credentials
- [ ] `.env.example` is tracked by git (not excluded by `.gitignore`)
- [ ] Copying `.env.example` to `.env` and running `node -e "require('dotenv').config(); console.log(process.env.PORT, process.env.NODE_ENV)"` outputs `3000 development`

## Dependencies

None — this task has no prerequisites and can be completed independently.

## References

- Tasks file: `plan/tasks/tasks-tier-1-foundation.json`
- Tier document: `plan/tiers/tier-1-foundation.md`
