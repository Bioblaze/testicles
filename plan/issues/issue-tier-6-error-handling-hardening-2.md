TITLE:
Create Pino logger factory with environment-aware settings in src/logger.js

BODY:
## Context

As part of **Tier 6: Error Handling, Logging & API Hardening**, we need a centralized, structured logger before any logging middleware or error handler can be wired up. This task creates `src/logger.js` — a Pino logger factory that adapts its behaviour based on `NODE_ENV`, giving us silent output in tests, human-readable pretty-printed output in development, and raw JSON output suitable for log aggregation in production.

This is a foundational piece: every subsequent middleware in this tier (`errorHandler`, `pino-http` integration, etc.) will import the logger from this module.

## Dependencies

- #163 — Install error handling, logging, and hardening dependencies (`pino`, `pino-http`, `express-rate-limit`, `helmet`, `pino-pretty`)

## Acceptance Criteria

- [ ] `src/logger.js` exists and exports a configured Pino logger instance as the module default.
- [ ] When `NODE_ENV === 'test'`, the log level is set to `silent` (no output during test runs).
- [ ] When `NODE_ENV === 'production'`, the log level is set to `info` with no transport (raw JSON to stdout).
- [ ] When `NODE_ENV === 'development'` (or any other value / undefined), the log level is set to `debug` and the `pino-pretty` transport is used with `colorize: true`.
- [ ] The module requires only `pino` (runtime) and optionally `pino-pretty` (dev transport) — no additional dependencies.
- [ ] Existing tests continue to pass (logger must not produce output when `NODE_ENV=test`).

## Implementation Notes

### Environment-aware configuration

| Environment   | `level`  | `transport`                                             |
|---------------|----------|---------------------------------------------------------|
| `test`        | `silent` | `undefined` (no output)                                 |
| `production`  | `info`   | `undefined` (raw JSON to stdout for log aggregation)    |
| `development` | `debug`  | `{ target: 'pino-pretty', options: { colorize: true } }`|

### Reference implementation

```javascript
const pino = require('pino');

const logger = pino({
  level: process.env.NODE_ENV === 'test'
    ? 'silent'
    : process.env.NODE_ENV === 'production'
      ? 'info'
      : 'debug',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

module.exports = logger;
```

### Key considerations

- The `transport` option uses Pino's worker-thread transport mechanism; `pino-pretty` is loaded dynamically so it only needs to be a dev dependency.
- In `production`, omitting `transport` means logs are written as newline-delimited JSON directly to stdout — ideal for log aggregation services (e.g., Datadog, ELK, CloudWatch).
- Setting `silent` in `test` keeps `jest` / `vitest` output clean and avoids interfering with test assertions on stdout.

## References

- Tasks file: `plan\tasks\tasks-tier-6-error-handling-hardening.json`
- Tier document: `plan\tiers\tier-6-error-handling-hardening.md`
