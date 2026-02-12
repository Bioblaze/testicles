const { BookNotFoundError, BookUnavailableError } = require('../errors');

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

    // 6. Re-SELECT and return the updated book row
    return db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  });

  return checkout();
}

module.exports = { checkoutBook };
