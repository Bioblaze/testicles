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
};

module.exports = Book;
