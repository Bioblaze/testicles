const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'migrations');

/**
 * Runs all pending SQL migrations against the given database instance.
 *
 * - Creates a `_migrations` meta-table if it does not exist.
 * - Reads `.sql` files from `src/db/migrations/` in lexicographic order.
 * - Skips migrations that have already been applied.
 * - Executes each unapplied migration inside a transaction for atomicity.
 * - Records each successfully applied migration in the `_migrations` table.
 * - Idempotent: safe to call multiple times without side effects.
 *
 * @param {import('better-sqlite3').Database} db - A better-sqlite3 database instance.
 */
function migrate(db) {
  // 1. Ensure the _migrations meta-table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 2. Read migration files, filter to .sql, sort lexicographically
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  // 3. Query already-applied migrations into a Set for O(1) lookup
  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all().map(row => row.name)
  );

  // 4. Prepare the insert statement for recording applied migrations
  const insertMigration = db.prepare(
    'INSERT INTO _migrations (name) VALUES (?)'
  );

  // 5. Apply each unapplied migration inside a transaction
  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    const applyMigration = db.transaction(() => {
      db.exec(sql);
      insertMigration.run(file);
    });

    applyMigration();
  }
}

module.exports = { migrate };
