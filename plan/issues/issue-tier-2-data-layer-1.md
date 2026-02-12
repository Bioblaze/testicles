TITLE:
Install production dependencies (better-sqlite3, uuid)

BODY:
## Context

This is the first task in Tier 2 (Data Persistence & Book Model) for the `book-api` project. Before the database connection factory, migration runner, or Book model can be implemented, the required production packages must be installed. `better-sqlite3` provides a synchronous SQLite driver that supports both file-based and in-memory databases with zero external configuration, and `uuid` provides RFC 4122 v4 UUID generation for book identifiers. Nearly every subsequent task in this tier depends on these packages being available.

## What needs to happen

1. Run `npm install better-sqlite3 uuid` to add both packages as production dependencies.
2. Verify that `better-sqlite3` appears in the `dependencies` section of `package.json`.
3. Verify that `uuid` appears in the `dependencies` section of `package.json`.
4. Confirm both packages resolve correctly (e.g., `require('better-sqlite3')` and `require('uuid')` do not throw).

## Acceptance Criteria

- [ ] `better-sqlite3` is listed under `dependencies` in `package.json`.
- [ ] `uuid` is listed under `dependencies` in `package.json`.
- [ ] `package-lock.json` is updated to reflect the new dependencies.
- [ ] `node_modules/` contains both installed packages.
- [ ] The packages can be required/imported without errors.
- [ ] Existing Tier 1 tests continue to pass (`npm test` remains green).

## Implementation Notes

- Use `npm install better-sqlite3 uuid` (without `--save-dev`) so both packages land in `dependencies`, not `devDependencies`. These are runtime requirements for the data layer.
- `better-sqlite3` includes a native C++ addon that compiles during installation. Ensure a compatible build toolchain is available (Python 3, a C++ compiler). On Windows, `windows-build-tools` or Visual Studio Build Tools may be required.
- Version strategy is **latest** for both packages, per the tier document. Lock files will pin the exact versions installed.
- Do **not** implement any source files in this task — the connection factory, migration runner, and Book model are handled by subsequent tasks.

## Dependencies

None — this is the first task in the tier and has no dependency on other Tier 2 tasks.

## References

- Tasks file: `plan/tasks/tasks-tier-2-data-layer.json`
- Tier document: `plan/tiers/tier-2-data-layer.md`
