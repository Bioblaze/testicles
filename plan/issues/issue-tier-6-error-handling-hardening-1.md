TITLE:
Install error handling, logging, and hardening dependencies (pino, pino-http, express-rate-limit, helmet, pino-pretty)

BODY:
## Context

This is the first task in Tier 6 (Error Handling, Logging & API Hardening) for the `book-api` project. Before any hardening middleware, structured logging, or rate limiting can be implemented, the necessary npm packages must be installed. This task adds four runtime dependencies — `pino` (high-performance structured JSON logger), `pino-http` (Express middleware for automatic request/response logging), `express-rate-limit` (IP-based rate limiting middleware), and `helmet` (security-related HTTP response headers) — plus one dev dependency, `pino-pretty`, which provides human-readable colorized log output during development. These packages are prerequisites for every subsequent task in Tier 6: the logger factory (`src/logger.js`), the centralized error handler (`src/middleware/errorHandler.js`), the rate limiter (`src/middleware/rateLimiter.js`), and the middleware integration in `src/app.js`.

## What needs to happen

1. Install the four runtime dependencies:
   ```bash
   npm install pino pino-http express-rate-limit helmet
   ```
2. Install the dev dependency for human-readable logs during development:
   ```bash
   npm install --save-dev pino-pretty
   ```
3. Verify that `package.json` lists:
   - `pino` under `dependencies`
   - `pino-http` under `dependencies`
   - `express-rate-limit` under `dependencies`
   - `helmet` under `dependencies`
   - `pino-pretty` under `devDependencies`
4. Verify `package-lock.json` has been updated and all five packages resolve correctly.
5. Run `npm test` to confirm all existing tests from prior tiers continue to pass with the new packages installed.

## Acceptance Criteria

- [ ] `pino` is listed in `package.json` under `dependencies`.
- [ ] `pino-http` is listed in `package.json` under `dependencies`.
- [ ] `express-rate-limit` is listed in `package.json` under `dependencies`.
- [ ] `helmet` is listed in `package.json` under `dependencies`.
- [ ] `pino-pretty` is listed in `package.json` under `devDependencies`.
- [ ] `package-lock.json` is updated with all five packages resolved.
- [ ] `npm install` completes without errors or peer dependency warnings.
- [ ] All prior tier tests (Tier 1 through Tier 5) continue to pass after installation.
- [ ] CI pipeline remains green.

## Implementation Notes

- **Version strategy**: All packages should be installed at their latest versions. No version pinning is required at this stage; the lockfile will capture the resolved versions.
- **`pino`** is a high-performance structured JSON logger optimized for Node.js. It outputs newline-delimited JSON to stdout, making it ideal for log aggregation in production environments.
- **`pino-http`** wraps a Pino logger instance to automatically log incoming HTTP requests and outgoing responses, including status codes, response times, and request metadata.
- **`express-rate-limit`** provides a simple IP-based rate limiting middleware. It will be configured in a later task with a 15-minute window and 100-request cap per IP.
- **`helmet`** sets various security-related HTTP headers (e.g., `X-Content-Type-Options`, `Strict-Transport-Security`, `X-Frame-Options`) to help protect the API from common web vulnerabilities.
- **`pino-pretty`** is a dev-only dependency used as a Pino transport to render structured JSON logs in a human-readable, colorized format during local development. It is not used in production or test environments.
- This task only installs packages — no source code changes are made. All middleware integration and configuration happen in subsequent Tier 6 tasks.

## Dependencies

None — this is the first task in Tier 6 and has no dependency on other Tier 6 tasks.

## References

- Tasks file: `plan/tasks/tasks-tier-6-error-handling-hardening.json`
- Tier document: `plan/tiers/tier-6-error-handling-hardening.md`
