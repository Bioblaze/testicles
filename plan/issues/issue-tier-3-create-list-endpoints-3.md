TITLE:
Implement validation error handler middleware (`src/middleware/validate.js`)

BODY:
## Context

As part of **Tier 3 — Create Book & List Books Endpoints**, we need a generic validation error handler middleware that works with `express-validator` to short-circuit requests that fail validation. This middleware will be reused by any route that applies declarative validation chains (starting with `POST /books`).

The `express-validator` package is already installed (#133) and the `src/middleware/` directory already exists (#134).

## Description

Create `src/middleware/validate.js` exporting a `validate` function that acts as Express middleware:

1. Call `validationResult(req)` from `express-validator` to collect any validation errors from preceding validation chains.
2. **If errors exist:**
   - Extract the errors array and normalize each entry into a `{ field, message }` object, mapping `err.path` to `field` and `err.msg` to `message`.
   - Respond with **400 Bad Request** and a JSON body of `{ errors: [{ field, message }, ...] }`.
   - Do **not** call `next()` — the request is short-circuited before reaching the route handler.
3. **If no errors:** call `next()` to pass control to the next middleware or route handler.

### Reference Implementation

```javascript
const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
    }));
    return res.status(400).json({ errors: formatted });
  }
  next();
}

module.exports = validate;
```

## Acceptance Criteria

- [ ] `src/middleware/validate.js` exists and exports a `validate` function.
- [ ] When preceding `express-validator` chains produce errors, the middleware responds with `400 Bad Request` and body `{ errors: [{ field, message }] }`.
- [ ] Error objects use `err.path` for the `field` property and `err.msg` for the `message` property.
- [ ] When validation errors are present, `next()` is **not** called — invalid requests never reach the route handler or model layer.
- [ ] When no validation errors exist, `next()` is called to pass control downstream.
- [ ] Existing Tier 1 and Tier 2 tests continue to pass.

## Implementation Notes

- The function is a standard Express middleware with the `(req, res, next)` signature — it is **not** a higher-order function (no wrapping needed).
- Use `validationResult(req).array()` to get the flat array of error objects.
- `err.path` (not the legacy `err.param`) is the correct field name accessor in current versions of `express-validator`.
- This middleware is intentionally generic so it can be reused across all future routes that require validation (e.g., `POST /books`, update endpoints, etc.).

## Dependencies

- #133 — Install `express-validator` dependency (provides `validationResult`)
- #134 — Create project directory structure for middleware and route tests (provides `src/middleware/`)

## References

- Tasks file: `plan\tasks\tasks-tier-3-create-list-endpoints.json`
- Tier document: `plan\tiers\tier-3-create-list-endpoints.md`
