TITLE:
Create project directory structure for middleware and route tests

BODY:
## Context

Tier 3 (Create Book & List Books Endpoints) introduces validation middleware and integration tests for the `POST /books` and `GET /books` endpoints. Before any source files can be created in these locations, the required directory structure must exist. Specifically, two new directories are needed:

- `src/middleware/` — will house the generic validation error handler (`validate.js`) used by the book routes.
- `test/routes/` — will house integration test files (`books.create.test.js`, `books.list.test.js`) for the new endpoints.

These directories do not currently exist in the project. Creating them up front unblocks all downstream Tier 3 tasks that write files into these paths.

## What needs to happen

1. Create the `src/middleware/` directory.
2. Create the `test/routes/` directory.
3. Verify both directories exist and are accessible.

## Acceptance Criteria

- [ ] `src/middleware/` directory exists in the project root.
- [ ] `test/routes/` directory exists in the project root.
- [ ] No existing files or directories are modified or removed.
- [ ] Existing Tier 1 and Tier 2 tests continue to pass (`npm test` remains green).

## Implementation Notes

- These are empty directories. Since Git does not track empty directories, you may add a `.gitkeep` file in each directory or simply create them as part of the first file written to each path. If the task is completed standalone, ensure the directories persist in version control via `.gitkeep` or equivalent.
- Do **not** create any source files in this task — the validation middleware (`src/middleware/validate.js`), book routes, and test files are handled by subsequent tasks in the tier.
- This is a quick scaffolding task with no code changes, so no build or compilation step is required.

## Dependencies

None — this task has no dependency on other Tier 3 tasks.

## References

- Tasks file: `plan/tasks/tasks-tier-3-create-list-endpoints.json`
- Tier document: `plan/tiers/tier-3-create-list-endpoints.md`
