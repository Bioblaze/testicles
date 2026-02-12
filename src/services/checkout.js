const { BookNotFoundError, BookUnavailableError } = require('../errors');
const checkoutHistory = require('../models/checkoutHistory');

/**
 * Checks out a book by transitioning its status from 'available' to 'checked_out'.
 *
 * All logic is wrapped in a better-sqlite3 transaction to ensure atomic read-then-write.
 *
 * @param {import('better-sqlite3').Database} db - A better-sqlite3 database instance.
 * @param {string} id - The UUID of the book to check out.
 * @returns {Object} The updated book row after checkout.
 * @throws {BookNotFoundError} If no book exists with the given id.
 * @throws {BookUnavailableError} If the book is not in 'available' status.
 */
function checkoutBook(db, id) {
  const checkout = db.transaction(() => {
    // 1. SELECT the book by id
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);

    // 2. If no book found, throw BookNotFoundError
    if (!book) {
      throw new BookNotFoundError();
    }

    // 3. If book is not available, throw BookUnavailableError
    if (book.status !== 'available') {
      throw new BookUnavailableError('Book is already checked out');
    }

    // 4. Compute current timestamp
    const now = new Date().toISOString();

    // 5. UPDATE the book to checked_out status
    db.prepare(
      'UPDATE books SET status = \'checked_out\', checked_out_at = ?, updated_at = ? WHERE id = ?'
    ).run(now, now, id);

    // 6. Record checkout history entry
    checkoutHistory.create(db, { bookId: id, action: 'checked_out' });

    // 7. Re-SELECT and return the updated book row
    return db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  });

  return checkout();
}

/**
 * Returns a checked-out book by transitioning its status from 'checked_out' to 'available'.
 *
 * All logic is wrapped in a better-sqlite3 transaction to ensure atomic read-then-write.
 *
 * @param {import('better-sqlite3').Database} db - A better-sqlite3 database instance.
 * @param {string} id - The UUID of the book to return.
 * @returns {Object} The updated book row after return.
 * @throws {BookNotFoundError} If no book exists with the given id.
 * @throws {BookUnavailableError} If the book is not in 'checked_out' status.
 */
function returnBook(db, id) {
  const doReturn = db.transaction(() => {
    // 1. SELECT the book by id
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);

    // 2. If no book found, throw BookNotFoundError
    if (!book) {
      throw new BookNotFoundError();
    }

    // 3. If book is not checked_out, throw BookUnavailableError
    if (book.status !== 'checked_out') {
      throw new BookUnavailableError('Book is not currently checked out');
    }

    // 4. Compute current timestamp
    const now = new Date().toISOString();

    // 5. UPDATE the book to available status, clear checked_out_at
    db.prepare(
      'UPDATE books SET status = \'available\', checked_out_at = null, updated_at = ? WHERE id = ?'
    ).run(now, id);

    // 6. Record return history entry
    checkoutHistory.create(db, { bookId: id, action: 'returned' });

    // 7. Re-SELECT and return the updated book row
    return db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  });

  return doReturn();
}

module.exports = { checkoutBook, returnBook };
