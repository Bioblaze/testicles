TITLE:
Create OpenAPI spec generation config in src/docs/swagger.js

BODY:
## Context

As part of **Tier 7 — API Documentation & Developer Experience**, the project needs an OpenAPI 3.0 specification generated directly from source code annotations. The `src/docs/swagger.js` module is the central configuration file that drives this: it uses `swagger-jsdoc` to scan route files for `@openapi` JSDoc blocks and produces a complete OpenAPI spec object.

This spec object is consumed downstream by Swagger UI (served at `/docs`) and the raw JSON endpoint (`/docs/json`), and is validated in CI to ensure documentation never drifts from the implementation.

## Acceptance Criteria

- [ ] File `src/docs/swagger.js` exists and is a valid Node.js module.
- [ ] The module imports `swagger-jsdoc` and calls it with the configured options.
- [ ] `definition.openapi` is set to `'3.0.0'`.
- [ ] `definition.info.title` is `'Book API'`.
- [ ] `definition.info.version` is `'1.0.0'`.
- [ ] `definition.info.description` is `'A RESTful API for managing a book library with checkout/return functionality'`.
- [ ] `definition.servers` contains one entry: `{ url: '/api', description: 'API server' }`.
- [ ] `apis` is set to `['./src/routes/*.js']` so all route files are scanned for `@openapi` annotations.
- [ ] The module calls `swaggerJsdoc(options)` and exports the resulting spec object via `module.exports`.
- [ ] The exported object is a valid OpenAPI 3.0 specification (structure verified by downstream spec validation tests).

## Implementation Notes

Create `src/docs/swagger.js` with the following implementation:

```javascript
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Book API',
      version: '1.0.0',
      description: 'A RESTful API for managing a book library with checkout/return functionality',
    },
    servers: [
      {
        url: '/api',
        description: 'API server',
      },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
```

### Key details

- The `apis` glob (`'./src/routes/*.js'`) tells `swagger-jsdoc` where to look for `@openapi` comment blocks. Any route file added to `src/routes/` will automatically be picked up.
- The exported spec object will be used by `src/app.js` to mount Swagger UI and the `/docs/json` endpoint (handled in a subsequent task).
- The spec is generated at module load time — it reflects the annotations present when the application starts.

## Dependencies

- #172 — Runtime dependencies `swagger-jsdoc` and `swagger-ui-express` must be installed before this module can be created.

## References

- Tasks file: `plan\tasks\tasks-tier-7-documentation-history.json`
- Tier document: `plan\tiers\tier-7-documentation-history.md`
