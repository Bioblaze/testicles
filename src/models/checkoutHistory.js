const { v4: uuidv4 } = require('uuid');

const CheckoutHistory = {
  /**
   * Creates a new checkout history record.
   *
   * Designed to work with both a raw database handle and a transactional
   * wrapper so it can be called inside an existing db.transaction() for
   * atomicity with book status updates.
   *
   * @param {import('better-sqlite3').Database} db - A better-sqlite3 database instance (or transactional wrapper).
   * @param {Object} params - The history entry fields.
   * @param {string} params.bookId - The UUID of the book.
   * @param {string} params.action - The action performed ("checked_out" or "returned").
   * @returns {Object} The created history entry { id, book_id, action, timestamp }.
   */
  create(db, { bookId, action }) {
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    db.prepare(
      'INSERT INTO checkout_history (id, book_id, action, timestamp) VALUES (?, ?, ?, ?)'
    ).run(id, bookId, action, timestamp);

    return { id, book_id: bookId, action, timestamp };
  },

  /**
   * Finds checkout history entries for a given book, with pagination.
   *
   * Returns entries in reverse chronological order (newest first) along
   * with the total count of history entries for the book.
   *
   * @param {import('better-sqlite3').Database} db - A better-sqlite3 database instance.
   * @param {string} bookId - The UUID of the book.
   * @param {Object} [options] - Pagination options.
   * @param {number} [options.limit=20] - Maximum number of entries to return.
   * @param {number} [options.offset=0] - Number of entries to skip.
   * @returns {{ entries: Object[], total: number }} Paginated history entries and total count.
   */
  findByBookId(db, bookId, { limit, offset } = {}) {
    const _limit = limit ?? 20;
    const _offset = offset ?? 0;

    const entries = db.prepare(
      'SELECT * FROM checkout_history WHERE book_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?'
    ).all(bookId, _limit, _offset);

    const { total } = db.prepare(
      'SELECT COUNT(*) AS total FROM checkout_history WHERE book_id = ?'
    ).get(bookId);

    return { entries, total };
  },
};

module.exports = CheckoutHistory;
