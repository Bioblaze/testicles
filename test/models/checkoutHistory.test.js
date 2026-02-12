const { getDatabase } = require('../../src/db/connection');
const { migrate } = require('../../src/db/migrate');
const Book = require('../../src/models/book');
const CheckoutHistory = require('../../src/models/checkoutHistory');
const { checkoutBook, returnBook } = require('../../src/services/checkout');

describe('CheckoutHistory model', () => {
  let db;

  beforeEach(() => {
    db = getDatabase(':memory:');
    migrate(db);
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  function seedBook(overrides = {}) {
    return Book.create(db, {
      title: 'Test Book',
      author: 'Test Author',
      isbn: '978-3-16-148410-0',
      published_year: 2023,
      ...overrides,
    });
  }

  test('history entry is created on checkout', () => {
    const book = seedBook();
    checkoutBook(db, book.id);

    const rows = db.prepare('SELECT * FROM checkout_history WHERE book_id = ?').all(book.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('checked_out');
  });

  test('history entry is created on return', () => {
    const book = seedBook();
    checkoutBook(db, book.id);
    returnBook(db, book.id);

    const rows = db.prepare('SELECT * FROM checkout_history WHERE book_id = ? ORDER BY timestamp DESC').all(book.id);
    expect(rows).toHaveLength(2);
    expect(rows[0].action).toBe('returned');
  });

  test('findByBookId returns entries in reverse chronological order', () => {
    const book = seedBook();
    checkoutBook(db, book.id);

    // Ensure the checkout entry has a definitively older timestamp so ordering is deterministic
    db.prepare(
      "UPDATE checkout_history SET timestamp = '2020-01-01T00:00:00.000Z' WHERE book_id = ? AND action = 'checked_out'"
    ).run(book.id);

    returnBook(db, book.id);

    const result = CheckoutHistory.findByBookId(db, book.id, {});
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].action).toBe('returned');
    expect(result.entries[1].action).toBe('checked_out');
  });

  test('findByBookId respects pagination', () => {
    const book = seedBook();

    for (let i = 0; i < 5; i++) {
      checkoutBook(db, book.id);
      // Assign a unique, ascending timestamp to ensure deterministic ordering
      db.prepare(
        'UPDATE checkout_history SET timestamp = ? WHERE rowid = (SELECT MAX(rowid) FROM checkout_history)'
      ).run(new Date(2020, 0, 1 + i * 2, 0, 0, 0).toISOString());

      returnBook(db, book.id);
      db.prepare(
        'UPDATE checkout_history SET timestamp = ? WHERE rowid = (SELECT MAX(rowid) FROM checkout_history)'
      ).run(new Date(2020, 0, 2 + i * 2, 0, 0, 0).toISOString());
    }

    const result = CheckoutHistory.findByBookId(db, book.id, { limit: 3, offset: 0 });
    expect(result.entries).toHaveLength(3);
    expect(result.total).toBe(10);
  });

  test('findByBookId returns empty array for book with no history', () => {
    const book = seedBook();

    const result = CheckoutHistory.findByBookId(db, book.id, {});
    expect(result).toEqual({ entries: [], total: 0 });
  });
});
