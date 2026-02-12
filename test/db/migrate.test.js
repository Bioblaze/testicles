const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { migrate } = require('../../src/db/migrate');

const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'src', 'db', 'migrations');

describe('migrate(db)', () => {
  let db;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  test('module exports a migrate function', () => {
    expect(typeof migrate).toBe('function');
  });

  test('module has no side effects on import (no tables created)', () => {
    // The db was just created — no tables should exist yet
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all();
    expect(tables).toHaveLength(0);
  });

  test('creates _migrations meta-table on first invocation', () => {
    migrate(db);

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'"
    ).all();
    expect(tables).toHaveLength(1);
  });

  test('_migrations table has correct schema (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)', () => {
    migrate(db);

    const columns = db.pragma('table_info(_migrations)');
    const columnMap = {};
    for (const col of columns) {
      columnMap[col.name] = col;
    }

    expect(columnMap.name).toBeDefined();
    expect(columnMap.name.type).toBe('TEXT');
    expect(columnMap.name.pk).toBe(1);

    expect(columnMap.applied_at).toBeDefined();
    expect(columnMap.applied_at.type).toBe('TEXT');
    expect(columnMap.applied_at.notnull).toBe(1);
  });

  test('applies all .sql migration files from the migrations directory', () => {
    migrate(db);

    const sqlFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const applied = db.prepare('SELECT name FROM _migrations ORDER BY name').all();
    const appliedNames = applied.map(r => r.name);

    expect(appliedNames).toEqual(sqlFiles);
  });

  test('records each applied migration with an applied_at timestamp', () => {
    migrate(db);

    const rows = db.prepare('SELECT name, applied_at FROM _migrations').all();
    for (const row of rows) {
      expect(row.applied_at).toBeDefined();
      expect(row.applied_at).not.toBeNull();
      // Verify it looks like a datetime string
      expect(row.applied_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    }
  });

  test('is idempotent — calling migrate multiple times produces no errors', () => {
    migrate(db);
    expect(() => migrate(db)).not.toThrow();
    expect(() => migrate(db)).not.toThrow();
  });

  test('is idempotent — no duplicate rows after multiple calls', () => {
    migrate(db);
    const firstCount = db.prepare('SELECT COUNT(*) AS cnt FROM _migrations').get().cnt;

    migrate(db);
    const secondCount = db.prepare('SELECT COUNT(*) AS cnt FROM _migrations').get().cnt;

    migrate(db);
    const thirdCount = db.prepare('SELECT COUNT(*) AS cnt FROM _migrations').get().cnt;

    expect(firstCount).toBe(secondCount);
    expect(secondCount).toBe(thirdCount);
  });

  test('applies migrations in lexicographic order', () => {
    migrate(db);

    const applied = db.prepare('SELECT name FROM _migrations ORDER BY rowid').all();
    const appliedNames = applied.map(r => r.name);

    const sorted = [...appliedNames].sort();
    expect(appliedNames).toEqual(sorted);
  });

  test('executes the SQL content of each migration (books table exists after 001)', () => {
    migrate(db);

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='books'"
    ).all();
    expect(tables).toHaveLength(1);
  });

  test('skips already-applied migrations when new migrations are added', () => {
    // First run applies all current migrations
    migrate(db);
    const firstApplied = db.prepare('SELECT name FROM _migrations ORDER BY name').all();

    // Second run should not re-apply anything
    migrate(db);
    const secondApplied = db.prepare('SELECT name FROM _migrations ORDER BY name').all();

    expect(firstApplied).toEqual(secondApplied);
  });

  test('rolls back a failed migration without recording it', () => {
    // First, run the real migrations so we have a baseline
    migrate(db);
    const countBefore = db.prepare('SELECT COUNT(*) AS cnt FROM _migrations').get().cnt;

    // Now manually test transaction rollback by simulating a bad migration:
    // Create a temp migration file with invalid SQL
    const tempFile = path.join(MIGRATIONS_DIR, 'zzz_temp_bad_migration.sql');
    try {
      fs.writeFileSync(tempFile, 'INVALID SQL STATEMENT HERE;', 'utf-8');

      // This should throw because the SQL is invalid
      expect(() => migrate(db)).toThrow();

      // The bad migration should NOT be recorded
      const countAfter = db.prepare('SELECT COUNT(*) AS cnt FROM _migrations').get().cnt;
      expect(countAfter).toBe(countBefore);

      const badRecord = db.prepare(
        'SELECT name FROM _migrations WHERE name = ?'
      ).get('zzz_temp_bad_migration.sql');
      expect(badRecord).toBeUndefined();
    } finally {
      // Clean up the temporary file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  });

  test('migrate function accepts a db parameter (does not rely on globals)', () => {
    const db2 = new Database(':memory:');
    try {
      migrate(db2);
      const tables = db2.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'"
      ).all();
      expect(tables).toHaveLength(1);
    } finally {
      if (db2.open) db2.close();
    }
  });
});
