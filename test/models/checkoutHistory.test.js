const { getDatabase } = require('../../src/db/connection');
const { migrate } = require('../../src/db/migrate');
const CheckoutHistory = require('../../src/models/checkoutHistory');
const Book = require('../../src/models/book');

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

function makeBook(overrides = {}) {
  return {
    title: 'Test Book',
    author: 'Test Author',
    isbn: '978-3-16-148410-0',
    published_year: 2023,
    ...overrides,
  };
}

describe('CheckoutHistory model', () => {
  describe('exports', () => {
    test('exports an object with create and findByBookId methods', () => {
      expect(CheckoutHistory).toBeDefined();
      expect(typeof CheckoutHistory.create).toBe('function');
      expect(typeof CheckoutHistory.findByBookId).toBe('function');
    });
  });

  describe('create(db, { bookId, action })', () => {
    let db;
    let book;

    beforeEach(() => {
      db = getDatabase(':memory:');
      migrate(db);
      book = Book.create(db, makeBook());
    });

    afterEach(() => {
      if (db && db.open) {
        db.close();
      }
    });

    test('returns an object with id, book_id, action, and timestamp', () => {
      const entry = CheckoutHistory.create(db, { bookId: book.id, action: 'checked_out' });

      expect(entry).toBeDefined();
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('book_id');
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('timestamp');
    });

    test('generates a valid UUID v4 for the id field', () => {
      const entry = CheckoutHistory.create(db, { bookId: book.id, action: 'checked_out' });

      expect(entry.id).toMatch(uuidV4Regex);
    });

    test('sets timestamp to a valid ISO-8601 string', () => {
      const before = new Date().toISOString();
      const entry = CheckoutHistory.create(db, { bookId: book.id, action: 'checked_out' });
      const after = new Date().toISOString();

      expect(entry.timestamp).toMatch(iso8601Regex);
      expect(entry.timestamp >= before).toBe(true);
      expect(entry.timestamp <= after).toBe(true);
    });

    test('sets book_id to the provided bookId', () => {
      const entry = CheckoutHistory.create(db, { bookId: book.id, action: 'checked_out' });

      expect(entry.book_id).toBe(book.id);
    });

    test('sets action to the provided action value', () => {
      const checkoutEntry = CheckoutHistory.create(db, { bookId: book.id, action: 'checked_out' });
      expect(checkoutEntry.action).toBe('checked_out');

      const returnEntry = CheckoutHistory.create(db, { bookId: book.id, action: 'returned' });
      expect(returnEntry.action).toBe('returned');
    });

    test('inserts a row into the checkout_history table', () => {
      const entry = CheckoutHistory.create(db, { bookId: book.id, action: 'checked_out' });

      const row = db.prepare('SELECT * FROM checkout_history WHERE id = ?').get(entry.id);
      expect(row).toBeDefined();
      expect(row.id).toBe(entry.id);
      expect(row.book_id).toBe(book.id);
      expect(row.action).toBe('checked_out');
      expect(row.timestamp).toBe(entry.timestamp);
    });

    test('works correctly inside a db.transaction() for atomicity', () => {
      let entry;

      const txn = db.transaction(() => {
        // Simulate a book status update inside the same transaction
        Book.update(db, book.id, { status: 'checked_out', checked_out_at: new Date().toISOString() });
        entry = CheckoutHistory.create(db, { bookId: book.id, action: 'checked_out' });
      });

      txn();

      // Verify both the book update and history insert persisted
      const updatedBook = Book.findById(db, book.id);
      expect(updatedBook.status).toBe('checked_out');

      const row = db.prepare('SELECT * FROM checkout_history WHERE id = ?').get(entry.id);
      expect(row).toBeDefined();
      expect(row.book_id).toBe(book.id);
      expect(row.action).toBe('checked_out');
    });

    test('generates unique ids for each entry', () => {
      const entry1 = CheckoutHistory.create(db, { bookId: book.id, action: 'checked_out' });
      const entry2 = CheckoutHistory.create(db, { bookId: book.id, action: 'returned' });

      expect(entry1.id).not.toBe(entry2.id);
    });
  });

  describe('findByBookId(db, bookId, { limit, offset })', () => {
    let db;
    let book;

    beforeEach(() => {
      db = getDatabase(':memory:');
      migrate(db);
      book = Book.create(db, makeBook());
    });

    afterEach(() => {
      if (db && db.open) {
        db.close();
      }
    });

    test('returns { entries: [], total: 0 } when no history exists for the book', () => {
      const result = CheckoutHistory.findByBookId(db, book.id);

      expect(result).toEqual({ entries: [], total: 0 });
    });

    test('returns entries and total count for a book with history', () => {
      CheckoutHistory.create(db, { bookId: book.id, action: 'checked_out' });
      CheckoutHistory.create(db, { bookId: book.id, action: 'returned' });

      const result = CheckoutHistory.findByBookId(db, book.id);

      expect(result.entries).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    test('defaults limit to 20 and offset to 0 when not provided', () => {
      // Insert 3 entries
      for (let i = 0; i < 3; i++) {
        CheckoutHistory.create(db, { bookId: book.id, action: i % 2 === 0 ? 'checked_out' : 'returned' });
      }

      const result = CheckoutHistory.findByBookId(db, book.id);

      expect(result.entries).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    test('respects limit and offset pagination', () => {
      // Insert 5 entries
      for (let i = 0; i < 5; i++) {
        CheckoutHistory.create(db, { bookId: book.id, action: i % 2 === 0 ? 'checked_out' : 'returned' });
      }

      const result = CheckoutHistory.findByBookId(db, book.id, { limit: 2, offset: 1 });

      expect(result.entries).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    test('total always reflects the full count regardless of pagination', () => {
      for (let i = 0; i < 5; i++) {
        CheckoutHistory.create(db, { bookId: book.id, action: 'checked_out' });
      }

      const page1 = CheckoutHistory.findByBookId(db, book.id, { limit: 1, offset: 0 });
      expect(page1.entries).toHaveLength(1);
      expect(page1.total).toBe(5);

      const page2 = CheckoutHistory.findByBookId(db, book.id, { limit: 3, offset: 4 });
      expect(page2.entries).toHaveLength(1);
      expect(page2.total).toBe(5);
    });

    test('returns entries in reverse chronological order (newest first)', () => {
      // Insert entries with slightly different timestamps
      const entry1 = CheckoutHistory.create(db, { bookId: book.id, action: 'checked_out' });

      // Manually insert an older entry to ensure ordering
      db.prepare(
        'INSERT INTO checkout_history (id, book_id, action, timestamp) VALUES (?, ?, ?, ?)'
      ).run('old-entry-id', book.id, 'returned', '2020-01-01T00:00:00.000Z');

      const result = CheckoutHistory.findByBookId(db, book.id);

      expect(result.entries).toHaveLength(2);
      // The first entry should have the newer timestamp
      expect(result.entries[0].timestamp >= result.entries[1].timestamp).toBe(true);
      expect(result.entries[1].id).toBe('old-entry-id');
    });

    test('only returns history for the specified book', () => {
      const book2 = Book.create(db, makeBook({ isbn: '978-0-00-000000-2', title: 'Other Book' }));

      CheckoutHistory.create(db, { bookId: book.id, action: 'checked_out' });
      CheckoutHistory.create(db, { bookId: book2.id, action: 'checked_out' });
      CheckoutHistory.create(db, { bookId: book.id, action: 'returned' });

      const result = CheckoutHistory.findByBookId(db, book.id);

      expect(result.entries).toHaveLength(2);
      expect(result.total).toBe(2);
      result.entries.forEach(entry => {
        expect(entry.book_id).toBe(book.id);
      });
    });

    test('entries contain id, book_id, action, and timestamp fields', () => {
      CheckoutHistory.create(db, { bookId: book.id, action: 'checked_out' });

      const result = CheckoutHistory.findByBookId(db, book.id);

      expect(result.entries).toHaveLength(1);
      const entry = result.entries[0];
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('book_id');
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('timestamp');
    });
  });
});
