TITLE:
Modify src/app.js to initialize database and mount book routes

BODY:
## Context

As part of **Tier 3 — Create Book & List Books Endpoints**, the Express application entry point (`src/app.js`) must be updated to wire up the database layer and the new book routes. Currently `src/app.js` only serves a health endpoint and a 404 catch-all. This task bridges the database connection/migration modules (from Tier 2) with the newly created book router (from earlier Tier 3 tasks) so the API can accept and serve book requests.

This task depends on:
- #136 — Implement POST /books route in `src/routes/books.js`
- #137 — Implement GET /books route with pagination in `src/routes/books.js`

## Acceptance Criteria

- [ ] `getDatabase` is imported from `./db/connection` and `migrate` is imported from `./db/migrate`.
- [ ] The database is initialized via `const db = getDatabase()` and migrations are run via `migrate(db)` at module level.
- [ ] The database instance is attached to `app.locals.db` so route handlers can access it via `req.app.locals.db`.
- [ ] `express.json()` middleware is registered at the top of the middleware stack (before any route handlers).
- [ ] `routes/books.js` is imported and mounted at the `/books` path.
- [ ] The existing `/health` route remains in its current position (before `/books`).
- [ ] The 404 catch-all middleware remains at the bottom of the middleware stack (after all routes).
- [ ] All existing Tier 1 and Tier 2 tests continue to pass.
- [ ] The application starts without errors.

## Implementation Notes

1. **Database initialization** — Import `getDatabase` and `migrate` at the top of `src/app.js`. Create the database instance and run migrations before defining routes:

   ```javascript
   const { getDatabase } = require('./db/connection');
   const { migrate } = require('./db/migrate');

   const db = getDatabase();
   migrate(db);

   app.locals.db = db;
   ```

2. **Middleware ordering** — The final middleware stack must follow this order:
   - `express.json()` (body parsing)
   - `GET /health` (health check)
   - `/books` router (book CRUD endpoints)
   - 404 catch-all (must be last)

3. **Route mounting** — Import the books router and mount it:

   ```javascript
   const booksRouter = require('./routes/books');
   app.use('/books', booksRouter);
   ```

4. **Database access pattern** — Route handlers in `routes/books.js` access the database via `req.app.locals.db`, keeping routes decoupled from database initialization.

5. **Test considerations** — When `NODE_ENV=test`, `getDatabase()` should return an in-memory SQLite database (`:memory:`), which is handled by the connection module. No special test logic is needed in `app.js`.

## References

- Tasks file: `plan\tasks\tasks-tier-3-create-list-endpoints.json`
- Tier document: `plan\tiers\tier-3-create-list-endpoints.md`
- Dependencies: #136, #137
