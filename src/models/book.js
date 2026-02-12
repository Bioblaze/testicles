const { v4: uuidv4 } = require('uuid');

const REQUIRED_FIELDS = ['title', 'author', 'isbn', 'published_year'];

const Book = {
  /**
   * Creates a new book record in the database.
   *
   * @param {import('better-sqlite3').Database} db - A better-sqlite3 database instance.
   * @param {Object} fields - The book fields.
   * @param {string} fields.title - The book title.
   * @param {string} fields.author - The book author.
   * @param {string} fields.isbn - The book ISBN (must be unique).
   * @param {number} fields.published_year - The year the book was published.
   * @returns {Object} The full book object including server-defaulted fields.
   * @throws {Error} If any required field is missing.
   * @throws {Error} If a book with the same ISBN already exists.
   */
  create(db, { title, author, isbn, published_year } = {}) {
    // 1. Validate required fields
    const fields = { title, author, isbn, published_year };
    for (const field of REQUIRED_FIELDS) {
      if (fields[field] === undefined || fields[field] === null || fields[field] === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // 2. Generate UUID v4 for the id
    const id = uuidv4();

    // 3. Insert with prepared statement
    const stmt = db.prepare(`
      INSERT INTO books (id, title, author, isbn, published_year)
      VALUES (?, ?, ?, ?, ?)
    `);

    // 4. Execute the insert inside try/catch
    try {
      stmt.run(id, title, author, isbn, published_year);
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed: books.isbn')) {
        throw new Error('A book with this ISBN already exists');
      }
      throw err;
    }

    // 5. Return the full row
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    return book;
  },

  /**
   * Finds a book by its primary key (id).
   *
   * @param {import('better-sqlite3').Database} db - A better-sqlite3 database instance.
   * @param {string} id - The UUID of the book to find.
   * @returns {Object|null} The book object if found, or null if no match.
   */
  findById(db, id) {
    const stmt = db.prepare('SELECT * FROM books WHERE id = ?');
    const book = stmt.get(id);
    return book || null;
  },

  /**
   * Returns a paginated list of books ordered by created_at DESC, along with the total count.
   *
   * @param {import('better-sqlite3').Database} db - A better-sqlite3 database instance.
   * @param {Object} [options] - Pagination options.
   * @param {number} [options.limit=20] - Maximum number of books to return.
   * @param {number} [options.offset=0] - Number of books to skip.
   * @returns {{ books: Object[], total: number }} Paginated books and total count.
   */
  findAll(db, { limit = 20, offset = 0 } = {}) {
    const books = db.prepare('SELECT * FROM books ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    const { total } = db.prepare('SELECT COUNT(*) AS total FROM books').get();
    return { books, total };
  },

  /**
   * Updates an existing book record with the provided fields.
   *
   * @param {import('better-sqlite3').Database} db - A better-sqlite3 database instance.
   * @param {string} id - The UUID of the book to update.
   * @param {Object} fields - An object containing the fields to update.
   * @param {string} [fields.title] - The book title.
   * @param {string} [fields.author] - The book author.
   * @param {string} [fields.isbn] - The book ISBN (must be unique).
   * @param {number} [fields.published_year] - The year the book was published.
   * @param {string} [fields.status] - The book status.
   * @param {string} [fields.checked_out_at] - The checkout timestamp.
   * @returns {Object|null} The full updated book object, or null if no book was found.
   * @throws {Error} If a book with the same ISBN already exists.
   */
  update(db, id, fields) {
    const ALLOWED_FIELDS = ['title', 'author', 'isbn', 'published_year', 'status', 'checked_out_at'];

    // Build dynamic SET clause from only allowed keys present in fields
    const setClauses = [];
    const values = [];

    for (const field of ALLOWED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(fields, field)) {
        setClauses.push(`${field} = ?`);
        values.push(fields[field]);
      }
    }

    // Always set updated_at
    const now = new Date().toISOString();
    setClauses.push('updated_at = ?');
    values.push(now);

    // Append id for WHERE clause
    values.push(id);

    const sql = `UPDATE books SET ${setClauses.join(', ')} WHERE id = ?`;

    try {
      const result = db.prepare(sql).run(...values);

      if (result.changes === 0) {
        return null;
      }
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed: books.isbn')) {
        throw new Error('A book with this ISBN already exists');
      }
      throw err;
    }

    // Re-select and return the full updated row
    return db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  },
};

module.exports = Book;
