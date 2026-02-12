TITLE:
Create project directory structure for db and models

BODY:
## Context

Tier 2 (Data Persistence & Book Model) introduces a SQLite-backed data layer with a connection factory, migration runner, Book data-access object, and associated unit tests. Before any of these source or test files can be created, the required directory structure must exist in the repository. This task scaffolds the four new directories that all subsequent Tier 2 implementation tasks depend on: `src/db/`, `src/db/migrations/`, `src/models/`, and `test/models/`.

This is a zero-risk, zero-logic change — it only creates empty directories (with `.gitkeep` files if necessary to ensure Git tracks them) and does not modify any existing code or configuration.

## What needs to happen

1. Create the `src/db/` directory for the database connection factory and migration runner.
2. Create the `src/db/migrations/` directory for SQL migration files (e.g., `001_create_books.sql`).
3. Create the `src/models/` directory for the Book data-access object.
4. Create the `test/models/` directory for the Book model unit tests.
5. Add `.gitkeep` files in each new directory so that Git tracks the empty directories until actual source files are added by subsequent tasks.

## Acceptance Criteria

- [ ] `src/db/` directory exists.
- [ ] `src/db/migrations/` directory exists.
- [ ] `src/models/` directory exists.
- [ ] `test/models/` directory exists.
- [ ] All four directories are tracked by Git (e.g., via `.gitkeep` files).
- [ ] No existing files or directories are modified or removed.
- [ ] All existing Tier 1 tests continue to pass (`npm test` remains green).

## Implementation Notes

- Each directory should contain a `.gitkeep` file so that Git tracks the otherwise-empty directories. These `.gitkeep` files will naturally be superseded and can be removed once real source files are added in later tasks.
- The `src/` and `test/` parent directories should already exist from Tier 1. If for any reason they do not, create them as well.
- This task is intentionally minimal — do not create any `.js` or `.sql` files here. Those are handled by dedicated tasks later in the tier (tasks 4–7 for source files, tasks 11–14 for test files).

## Dependencies

None — this task has no dependency on other Tier 2 tasks and can be completed in parallel with #117 and #118.

## References

- Tasks file: `plan/tasks/tasks-tier-2-data-layer.json`
- Tier document: `plan/tiers/tier-2-data-layer.md`
