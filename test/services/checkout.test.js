const { getDatabase } = require('../../src/db/connection');
const { migrate } = require('../../src/db/migrate');
const Book = require('../../src/models/book');
const { checkoutBook, returnBook } = require('../../src/services/checkout');
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

describe('returnBook(db, id)', () => {
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

  test('transitions checked_out → available', () => {
    checkoutBook(db, seededBook.id);
    const result = returnBook(db, seededBook.id);
    expect(result.status).toBe('available');
  });

  test('clears checked_out_at to null', () => {
    checkoutBook(db, seededBook.id);
    const result = returnBook(db, seededBook.id);
    expect(result.checked_out_at).toBeNull();
  });

  test('throws BookNotFoundError for a non-existent UUID', () => {
    expect(() => {
      returnBook(db, 'non-existent-uuid');
    }).toThrow(BookNotFoundError);
  });

  test('throws BookUnavailableError with correct message when book is available', () => {
    expect(() => {
      returnBook(db, seededBook.id);
    }).toThrow(BookUnavailableError);

    try {
      returnBook(db, seededBook.id);
    } catch (err) {
      expect(err).toBeInstanceOf(BookUnavailableError);
      expect(err.message).toBe('Book is not currently checked out');
    }
  });
});

describe('Full lifecycle: checkout → return → checkout', () => {
  let db;
  let seededBook;

  beforeEach(() => {
    db = getDatabase(':memory:');
    migrate(db);
    seededBook = Book.create(db, {
      title: 'Lifecycle Book',
      author: 'Lifecycle Author',
      isbn: '978-0-00-000000-0',
      published_year: 2024,
    });
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  test('create → checkout → return → checkout again all succeed, final status is checked_out', () => {
    // First checkout
    const checkedOut = checkoutBook(db, seededBook.id);
    expect(checkedOut.status).toBe('checked_out');

    // Return
    const returned = returnBook(db, seededBook.id);
    expect(returned.status).toBe('available');

    // Checkout again
    const checkedOutAgain = checkoutBook(db, seededBook.id);
    expect(checkedOutAgain.status).toBe('checked_out');
  });
});
