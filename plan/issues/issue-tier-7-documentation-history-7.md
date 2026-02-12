TITLE:
Add @openapi JSDoc annotations to all route handlers

BODY:
## Context

The OpenAPI spec generation config (`src/docs/swagger.js`) scans route files for `@openapi` JSDoc comment blocks using `swagger-jsdoc`. Currently, none of the route handlers in `src/routes/books.js` or `src/routes/health.js` have these annotations. Without them, the generated OpenAPI spec will be empty and Swagger UI will render no endpoints.

These annotations are the **single source of truth** for the API specification. Downstream spec validation tests (Tier 7) verify that every registered Express route has a corresponding path in the spec, so missing or malformed annotations will block CI.

This task depends on #176 (OpenAPI spec generation config) and #177 (GET /books/:id/history route handler) being completed first, since the config must exist to consume the annotations and the history route must be in place to annotate.

## Acceptance Criteria

- [ ] Every route handler in `src/routes/health.js` has an `@openapi` JSDoc comment block.
- [ ] Every route handler in `src/routes/books.js` has an `@openapi` JSDoc comment block.
- [ ] Each annotation includes the correct path and HTTP method.
- [ ] Each annotation includes a summary and description.
- [ ] Path parameters (`id`) include `type`, `format` (uuid), and `description`.
- [ ] Query parameters (`page`, `limit`) include `type`, default values, and constraints where applicable.
- [ ] POST endpoints (`POST /books`, `POST /books/:id/checkout`, `POST /books/:id/return`) include `requestBody` schema definitions.
- [ ] All response codes for each route are documented with schema definitions.
- [ ] Each annotation includes a `tags` array for endpoint grouping.
- [ ] `swagger-jsdoc` successfully parses all annotations and produces a valid OpenAPI 3.0 spec.
- [ ] All prior tier tests continue to pass.

## Routes to Annotate

| Route | Method | Tag | File |
|---|---|---|---|
| `/health` | `GET` | Health | `src/routes/health.js` |
| `/books` | `POST` | Books | `src/routes/books.js` |
| `/books` | `GET` | Books | `src/routes/books.js` |
| `/books/:id` | `GET` | Books | `src/routes/books.js` |
| `/books/:id/checkout` | `POST` | Books | `src/routes/books.js` |
| `/books/:id/return` | `POST` | Books | `src/routes/books.js` |
| `/books/:id/history` | `GET` | History | `src/routes/books.js` |

## Implementation Notes

### Annotation Structure

Each `@openapi` block is a JSDoc comment placed immediately above the route handler registration. The YAML inside the comment follows the OpenAPI 3.0 specification format.

### Required Fields Per Annotation

1. **Path and method** — must match the Express route (use OpenAPI path syntax, e.g. `/books/{id}` not `/books/:id`)
2. **Tags** — array for grouping in Swagger UI (`Health`, `Books`, or `History`)
3. **Summary** — short one-line description
4. **Description** — longer explanation of the endpoint's behavior
5. **Parameters** — for path params and query params, each with `name`, `in`, `required`, `schema` (including `type`, `format`, `description`)
6. **Request body** — for POST endpoints, include `required: true`, `content` with `application/json` schema listing all properties, required fields, types, and constraints
7. **Responses** — every status code the handler can return, each with `description` and `content` schema where applicable

### Example Formats

**`GET /health`** (from tier plan):
```javascript
/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     description: Returns the API health status
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
```

**`POST /books`** (from tier plan):
```javascript
/**
 * @openapi
 * /books:
 *   post:
 *     tags: [Books]
 *     summary: Create a new book
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, author, isbn, published_year]
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               author:
 *                 type: string
 *                 maxLength: 255
 *               isbn:
 *                 type: string
 *                 description: Valid ISBN-10 or ISBN-13
 *               published_year:
 *                 type: integer
 *                 minimum: 1000
 *     responses:
 *       201:
 *         description: Book created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Duplicate ISBN conflict
 */
```

### Route-Specific Notes

- **`GET /books`** — document query parameters `page` and `limit` with defaults and constraints; document 200 response with paginated data array
- **`GET /books/{id}`** — document path parameter `id` as UUID v4; document 200 (book found), 400 (invalid UUID), 404 (not found) responses
- **`POST /books/{id}/checkout`** — document path parameter `id`; document 200 (checked out), 400 (invalid UUID or already checked out), 404 (not found) responses
- **`POST /books/{id}/return`** — document path parameter `id`; document 200 (returned), 400 (invalid UUID or not checked out), 404 (not found) responses
- **`GET /books/{id}/history`** — use tag `History`; document path parameter `id` and query parameters `page`/`limit`; document 200 (paginated history), 400 (invalid UUID), 404 (not found) responses

### Path Syntax

OpenAPI uses `{id}` for path parameters while Express uses `:id`. Annotations must use the OpenAPI syntax (e.g. `/books/{id}/history`).

## Dependencies

- #176 — OpenAPI spec generation config (`src/docs/swagger.js`) must exist to consume annotations
- #177 — `GET /books/:id/history` route handler must be implemented before it can be annotated

## References

- Tasks file: `plan\tasks\tasks-tier-7-documentation-history.json`
- Tier document: `plan\tiers\tier-7-documentation-history.md`
