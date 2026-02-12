const { getDatabase } = require('../../src/db/connection');
const { migrate } = require('../../src/db/migrate');
const Book = require('../../src/models/book');
const { checkoutBook } = require('../../src/services/checkout');
const { BookNotFoundError, BookUnavailableError } = require('../../src/errors');

describe('checkoutBook(db, id)', () => {
  let db;
  let seededBook;

  beforeEach(() => {
    db = getDatabase(':memory:');
    migrate(db);
    seededBook = Book.create(db, {
      title: 'Test Book',
      author: 'Test Author',
      isbn: '978-3-16-148410-0',
      published_year: 2023,
    });
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  test('transitions available → checked_out', () => {
    const result = checkoutBook(db, seededBook.id);
    expect(result.status).toBe('checked_out');
  });

  test('sets checked_out_at to a valid ISO-8601 string (not null)', () => {
    const result = checkoutBook(db, seededBook.id);
    expect(result.checked_out_at).not.toBeNull();
    expect(new Date(result.checked_out_at).toString()).not.toBe('Invalid Date');
  });

  test('throws BookNotFoundError for a non-existent UUID', () => {
    expect(() => {
      checkoutBook(db, 'non-existent-uuid');
    }).toThrow(BookNotFoundError);
  });

  test('throws BookUnavailableError with correct message when already checked out', () => {
    checkoutBook(db, seededBook.id);

    expect(() => {
      checkoutBook(db, seededBook.id);
    }).toThrow(BookUnavailableError);

    try {
      checkoutBook(db, seededBook.id);
    } catch (err) {
      expect(err).toBeInstanceOf(BookUnavailableError);
      expect(err.message).toBe('Book is already checked out');
    }
  });
});
