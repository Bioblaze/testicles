TITLE:
Update .gitignore to exclude database files and data directory

BODY:
## Context

As part of Tier 2 (Data Persistence & Book Model), the project is introducing SQLite via `better-sqlite3` for data storage. The default production database path is `./data/books.db`. To prevent SQLite database files and the `data/` directory from being accidentally committed to version control, the `.gitignore` file must be updated with the appropriate exclusion patterns. This is a prerequisite hygiene step that should be completed early in the tier to avoid any risk of committing binary database files.

## What needs to happen

1. Open (or create if it does not yet exist) the `.gitignore` file at the repository root.
2. Append a `*.db` entry to ignore all SQLite database files regardless of location.
3. Append a `data/` entry to ignore the entire `data/` directory, which is the default storage location for the production database (`data/books.db`).
4. Ensure existing `.gitignore` entries are preserved and the new entries do not introduce duplicates.
5. Verify that `git status` no longer shows any `*.db` files or the `data/` directory as untracked or modified.

## Acceptance Criteria

- [ ] `.gitignore` contains a `*.db` entry that excludes all SQLite database files.
- [ ] `.gitignore` contains a `data/` entry that excludes the data directory.
- [ ] No existing `.gitignore` entries are removed or altered.
- [ ] Running `git status` after the change confirms that database files and the `data/` directory are ignored.
- [ ] All existing Tier 1 tests continue to pass (`npm test` remains green).

## Implementation Notes

- This is a simple file-append operation. Add the new entries under a clearly commented section (e.g., `# Database files`) for readability.
- If `.gitignore` does not yet exist, create it with the two required entries.
- If `*.db` or `data/` entries already exist in `.gitignore`, do not add duplicates.
- If any `*.db` files or a `data/` directory are already tracked by Git, they must be removed from tracking with `git rm --cached` before the ignore rules take effect.

## Dependencies

None — this task has no dependency on other Tier 2 tasks and can be completed in parallel with any other task in the tier.

## References

- Tasks file: `plan/tasks/tasks-tier-2-data-layer.json`
- Tier document: `plan/tiers/tier-2-data-layer.md`
