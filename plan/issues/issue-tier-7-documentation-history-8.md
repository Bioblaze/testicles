TITLE:
Integrate Swagger UI and JSON spec endpoint into src/app.js

BODY:
## Context

The OpenAPI 3.0 spec is already generated via `swagger-jsdoc` in `src/docs/swagger.js` (#176), and all route handlers have been annotated with `@openapi` JSDoc blocks (#178). The final step to make the interactive documentation accessible is to mount Swagger UI and expose a raw JSON spec endpoint directly in the Express application.

This task wires the generated spec into `src/app.js` so that developers and consumers can browse the interactive API documentation at `/docs` and programmatically consume the OpenAPI JSON at `/docs/json`.

## Changes Required

Modify `src/app.js` to:

1. **Import dependencies**:
   - `swagger-ui-express` as `swaggerUi`
   - The generated spec from `./docs/swagger` as `swaggerSpec`

2. **Mount Swagger UI** at `/docs`:
   ```javascript
   app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
   ```

3. **Add raw JSON endpoint** at `/docs/json`:
   ```javascript
   app.get('/docs/json', (req, res) => {
     res.json(swaggerSpec);
   });
   ```

4. **Middleware stack ordering** — the Swagger routes must be placed after `rateLimiter` but before the API routes, resulting in the final order:
   1. `helmet()`
   2. `pino-http(logger)`
   3. `express.json()`
   4. `rateLimiter`
   5. **Swagger UI at `/docs`** ← new
   6. **Swagger JSON at `/docs/json`** ← new
   7. Health route at `/health`
   8. Book routes at `/books` (includes `/:id`, `/:id/checkout`, `/:id/return`, `/:id/history`)
   9. 404 catch-all
   10. `errorHandler`

## Acceptance Criteria

- [ ] `src/app.js` imports `swagger-ui-express` and the generated spec from `./docs/swagger`
- [ ] Swagger UI is accessible at `/docs` and renders all annotated endpoints
- [ ] Raw OpenAPI JSON is available at `GET /docs/json` and returns the complete spec
- [ ] Swagger UI and JSON routes are positioned after `rateLimiter` and before API routes in the middleware stack
- [ ] The middleware ordering matches the 10-step sequence defined in the tier plan
- [ ] All prior tier tests continue to pass
- [ ] No regressions in existing middleware behavior (helmet, logging, JSON parsing, rate limiting)

## Implementation Notes

- `swagger-ui-express` serves static assets (HTML, CSS, JS) for the interactive UI; `swaggerUi.serve` is an array of middleware, so it must be spread or passed as-is to `app.use`.
- `swaggerUi.setup(swaggerSpec)` returns a middleware that injects the spec into the UI page.
- The `/docs/json` endpoint is useful for external tooling (e.g., Postman import, code generation, CI validation).
- Placing documentation routes before API routes ensures they are accessible even if API route matching were to interfere, and keeps documentation outside the API path prefix.

## Dependencies

- #176 — OpenAPI spec generation config in `src/docs/swagger.js`
- #178 — `@openapi` JSDoc annotations on all route handlers

## References

- Tasks file: `plan\tasks\tasks-tier-7-documentation-history.json`
- Tier document: `plan\tiers\tier-7-documentation-history.md`
