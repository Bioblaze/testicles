TITLE:
Create project directory structure (src/, src/routes/, test/, .github/workflows/)

BODY:
## Context

This is part of **Tier 1: Foundation & Continuous Integration**, which establishes the Node.js project skeleton, installs core dependencies, configures the test runner, and wires a CI pipeline before any business logic is introduced.

Before any source files, test files, or CI configuration can be created, the underlying directory structure must exist. This task creates the four foundational directories that all subsequent Tier 1 tasks depend on for file placement:

| Directory | Purpose |
|---|---|
| `src/` | Contains the Express application factory (`app.js`) and production entry point (`server.js`) |
| `src/routes/` | Houses Express Router modules (starting with `health.js`) |
| `test/` | Contains all Jest integration and unit test files |
| `.github/workflows/` | Holds GitHub Actions CI/CD pipeline definitions (`ci.yml`) |

Without this scaffold in place, downstream tasks that create files in these directories would either fail or need to implicitly create the directories themselves, leading to unclear ownership and ordering issues.

## Implementation Notes

Create the following empty directories at the project root:

```
book-api/
├── src/
│   └── routes/
├── test/
└── .github/
    └── workflows/
```

### Steps

1. Create `src/` directory at the project root.
2. Create `src/routes/` subdirectory inside `src/`.
3. Create `test/` directory at the project root.
4. Create `.github/workflows/` nested directory at the project root.

### Notes

- This task has **no dependencies** on other tasks and can be completed at any time.
- Since Git does not track empty directories, each directory should contain a `.gitkeep` file (or the directories will be created implicitly when their first real file is added). If using `.gitkeep` files, they should be removed once actual files are placed in the directories.
- The `.github/` directory is a hidden directory (prefixed with a dot) — ensure it is created correctly on all platforms.
- This is a prerequisite for multiple downstream tasks: the health route module (task for `src/routes/health.js`), the Express app factory (task for `src/app.js`), tests (task for `test/health.test.js`), and the CI workflow (task for `.github/workflows/ci.yml`).

## Acceptance Criteria

- [ ] `src/` directory exists at the project root
- [ ] `src/routes/` directory exists inside `src/`
- [ ] `test/` directory exists at the project root
- [ ] `.github/workflows/` directory exists at the project root (nested two levels: `.github/` → `workflows/`)
- [ ] No extraneous files are created outside the required directories
- [ ] Directory structure matches the layout defined in the tier document's **Project Structure** section

## Dependencies

None — this task has no prerequisites and can be completed independently.

## References

- Tasks file: `plan/tasks/tasks-tier-1-foundation.json`
- Tier document: `plan/tiers/tier-1-foundation.md`
