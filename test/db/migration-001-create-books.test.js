const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const MIGRATION_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'src',
  'db',
  'migrations',
  '001_create_books.sql'
);

describe('001_create_books.sql migration', () => {
  let db;
  let sql;

  beforeAll(() => {
    sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
  });

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  test('migration file exists at src/db/migrations/001_create_books.sql', () => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
  });

  test('contains a CREATE TABLE IF NOT EXISTS books statement', () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+books/i);
  });

  test('executes without errors on better-sqlite3', () => {
    expect(() => db.exec(sql)).not.toThrow();
  });

  test('is idempotent — can be executed twice without errors', () => {
    db.exec(sql);
    expect(() => db.exec(sql)).not.toThrow();
  });

  test('creates a books table with all required columns and correct types', () => {
    db.exec(sql);
    const columns = db.pragma('table_info(books)');

    const columnMap = {};
    for (const col of columns) {
      columnMap[col.name] = col;
    }

    // id: TEXT PRIMARY KEY
    expect(columnMap.id).toBeDefined();
    expect(columnMap.id.type).toBe('TEXT');
    expect(columnMap.id.pk).toBe(1);

    // title: TEXT NOT NULL
    expect(columnMap.title).toBeDefined();
    expect(columnMap.title.type).toBe('TEXT');
    expect(columnMap.title.notnull).toBe(1);

    // author: TEXT NOT NULL
    expect(columnMap.author).toBeDefined();
    expect(columnMap.author.type).toBe('TEXT');
    expect(columnMap.author.notnull).toBe(1);

    // isbn: TEXT NOT NULL (UNIQUE checked separately)
    expect(columnMap.isbn).toBeDefined();
    expect(columnMap.isbn.type).toBe('TEXT');
    expect(columnMap.isbn.notnull).toBe(1);

    // published_year: INTEGER NOT NULL
    expect(columnMap.published_year).toBeDefined();
    expect(columnMap.published_year.type).toBe('INTEGER');
    expect(columnMap.published_year.notnull).toBe(1);

    // status: TEXT NOT NULL DEFAULT 'available'
    expect(columnMap.status).toBeDefined();
    expect(columnMap.status.type).toBe('TEXT');
    expect(columnMap.status.notnull).toBe(1);
    expect(columnMap.status.dflt_value).toBe("'available'");

    // checked_out_at: TEXT, nullable
    expect(columnMap.checked_out_at).toBeDefined();
    expect(columnMap.checked_out_at.type).toBe('TEXT');
    expect(columnMap.checked_out_at.notnull).toBe(0);

    // created_at: TEXT NOT NULL DEFAULT (datetime('now'))
    expect(columnMap.created_at).toBeDefined();
    expect(columnMap.created_at.type).toBe('TEXT');
    expect(columnMap.created_at.notnull).toBe(1);
    expect(columnMap.created_at.dflt_value).toBe("datetime('now')");

    // updated_at: TEXT NOT NULL DEFAULT (datetime('now'))
    expect(columnMap.updated_at).toBeDefined();
    expect(columnMap.updated_at.type).toBe('TEXT');
    expect(columnMap.updated_at.notnull).toBe(1);
    expect(columnMap.updated_at.dflt_value).toBe("datetime('now')");
  });

  test('isbn column has a UNIQUE constraint', () => {
    db.exec(sql);
    const indexes = db.pragma('index_list(books)');
    const uniqueIndexes = indexes.filter((idx) => idx.unique === 1);

    // Find the unique index that covers isbn
    let isbnIsUnique = false;
    for (const idx of uniqueIndexes) {
      const info = db.pragma(`index_info(${idx.name})`);
      if (info.some((col) => col.name === 'isbn')) {
        isbnIsUnique = true;
        break;
      }
    }
    expect(isbnIsUnique).toBe(true);
  });

  test('table has exactly 9 columns', () => {
    db.exec(sql);
    const columns = db.pragma('table_info(books)');
    expect(columns).toHaveLength(9);
  });

  test('checked_out_at defaults to NULL', () => {
    db.exec(sql);
    const columns = db.pragma('table_info(books)');
    const checkedOutAt = columns.find((c) => c.name === 'checked_out_at');
    expect(checkedOutAt.dflt_value).toBeNull();
  });

  test('default values work correctly on insert', () => {
    db.exec(sql);
    const stmt = db.prepare(
      "INSERT INTO books (id, title, author, isbn, published_year) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run('test-uuid-1', 'Test Book', 'Test Author', '978-0-123456-47-2', 2024);

    const row = db.prepare('SELECT * FROM books WHERE id = ?').get('test-uuid-1');
    expect(row).toBeDefined();
    expect(row.status).toBe('available');
    expect(row.checked_out_at).toBeNull();
    expect(row.created_at).toBeDefined();
    expect(row.created_at).not.toBeNull();
    expect(row.updated_at).toBeDefined();
    expect(row.updated_at).not.toBeNull();
  });
});
