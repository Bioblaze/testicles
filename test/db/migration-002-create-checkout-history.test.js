const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const MIGRATION_001_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'src',
  'db',
  'migrations',
  '001_create_books.sql'
);

const MIGRATION_002_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'src',
  'db',
  'migrations',
  '002_create_checkout_history.sql'
);

describe('002_create_checkout_history.sql migration', () => {
  let db;
  let sql001;
  let sql002;

  beforeAll(() => {
    sql001 = fs.readFileSync(MIGRATION_001_PATH, 'utf-8');
    sql002 = fs.readFileSync(MIGRATION_002_PATH, 'utf-8');
  });

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    // Apply the books migration first since checkout_history references books(id)
    db.exec(sql001);
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  test('migration file exists at src/db/migrations/002_create_checkout_history.sql', () => {
    expect(fs.existsSync(MIGRATION_002_PATH)).toBe(true);
  });

  test('contains a CREATE TABLE IF NOT EXISTS checkout_history statement', () => {
    expect(sql002).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+checkout_history/i);
  });

  test('executes without errors on better-sqlite3', () => {
    expect(() => db.exec(sql002)).not.toThrow();
  });

  test('is idempotent — can be executed twice without errors', () => {
    db.exec(sql002);
    expect(() => db.exec(sql002)).not.toThrow();
  });

  test('creates a checkout_history table with all required columns and correct types', () => {
    db.exec(sql002);
    const columns = db.pragma('table_info(checkout_history)');

    const columnMap = {};
    for (const col of columns) {
      columnMap[col.name] = col;
    }

    // id: TEXT PRIMARY KEY
    expect(columnMap.id).toBeDefined();
    expect(columnMap.id.type).toBe('TEXT');
    expect(columnMap.id.pk).toBe(1);

    // book_id: TEXT NOT NULL
    expect(columnMap.book_id).toBeDefined();
    expect(columnMap.book_id.type).toBe('TEXT');
    expect(columnMap.book_id.notnull).toBe(1);

    // action: TEXT NOT NULL
    expect(columnMap.action).toBeDefined();
    expect(columnMap.action.type).toBe('TEXT');
    expect(columnMap.action.notnull).toBe(1);

    // timestamp: TEXT NOT NULL
    expect(columnMap.timestamp).toBeDefined();
    expect(columnMap.timestamp.type).toBe('TEXT');
    expect(columnMap.timestamp.notnull).toBe(1);
  });

  test('table has exactly 4 columns', () => {
    db.exec(sql002);
    const columns = db.pragma('table_info(checkout_history)');
    expect(columns).toHaveLength(4);
  });

  test('book_id column has a foreign key reference to books(id)', () => {
    db.exec(sql002);
    const foreignKeys = db.pragma('foreign_key_list(checkout_history)');
    const bookFk = foreignKeys.find(
      (fk) => fk.from === 'book_id' && fk.table === 'books' && fk.to === 'id'
    );
    expect(bookFk).toBeDefined();
  });

  test('creates idx_checkout_history_book_id index on book_id', () => {
    db.exec(sql002);
    const indexes = db.pragma('index_list(checkout_history)');
    const bookIdIndex = indexes.find(
      (idx) => idx.name === 'idx_checkout_history_book_id'
    );
    expect(bookIdIndex).toBeDefined();

    // Verify the index covers the book_id column
    const indexInfo = db.pragma('index_info(idx_checkout_history_book_id)');
    expect(indexInfo).toHaveLength(1);
    expect(indexInfo[0].name).toBe('book_id');
  });

  test('runs successfully against an existing database with the books table', () => {
    // books table already created in beforeEach
    // Insert a book to ensure the table is populated
    db.prepare(
      "INSERT INTO books (id, title, author, isbn, published_year) VALUES (?, ?, ?, ?, ?)"
    ).run('test-uuid-1', 'Test Book', 'Test Author', '978-0-123456-47-2', 2024);

    expect(() => db.exec(sql002)).not.toThrow();

    // Verify we can insert a checkout_history row referencing the book
    const stmt = db.prepare(
      "INSERT INTO checkout_history (id, book_id, action, timestamp) VALUES (?, ?, ?, ?)"
    );
    expect(() =>
      stmt.run('history-uuid-1', 'test-uuid-1', 'checked_out', '2025-02-10T15:30:00.000Z')
    ).not.toThrow();

    const row = db.prepare('SELECT * FROM checkout_history WHERE id = ?').get('history-uuid-1');
    expect(row).toBeDefined();
    expect(row.book_id).toBe('test-uuid-1');
    expect(row.action).toBe('checked_out');
    expect(row.timestamp).toBe('2025-02-10T15:30:00.000Z');
  });

  test('foreign key constraint prevents inserting with non-existent book_id', () => {
    db.exec(sql002);
    const stmt = db.prepare(
      "INSERT INTO checkout_history (id, book_id, action, timestamp) VALUES (?, ?, ?, ?)"
    );
    expect(() =>
      stmt.run('history-uuid-2', 'non-existent-book', 'checked_out', '2025-02-10T15:30:00.000Z')
    ).toThrow();
  });
});
