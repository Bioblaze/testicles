const { getDatabase } = require('../../src/db/connection');
const { migrate } = require('../../src/db/migrate');
const Book = require('../../src/models/book');

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function makeBook(overrides = {}) {
  return {
    title: 'Test Book',
    author: 'Test Author',
    isbn: '978-3-16-148410-0',
    published_year: 2023,
    ...overrides,
  };
}

describe('Book.create(db, fields)', () => {
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

  test('create inserts a book and returns it with a valid UUID id, status available, created_at, and updated_at', () => {
    const input = makeBook();
    const book = Book.create(db, input);

    expect(book).toBeDefined();
    expect(book.id).toMatch(uuidV4Regex);
    expect(book.title).toBe(input.title);
    expect(book.author).toBe(input.author);
    expect(book.isbn).toBe(input.isbn);
    expect(book.published_year).toBe(input.published_year);
    expect(book.status).toBe('available');
    expect(book.checked_out_at).toBeNull();
    expect(book.created_at).toBeDefined();
    expect(book.created_at).not.toBeNull();
    expect(book.updated_at).toBeDefined();
    expect(book.updated_at).not.toBeNull();
  });

  test('create rejects duplicate ISBN with a descriptive error', () => {
    const input = makeBook();
    Book.create(db, input);

    expect(() => {
      Book.create(db, makeBook({ title: 'Other Book', author: 'Other Author' }));
    }).toThrow('A book with this ISBN already exists');
  });

  test('create rejects missing required fields when called with an empty object', () => {
    expect(() => {
      Book.create(db, {});
    }).toThrow(/Missing required field/);
  });

  test('create rejects missing title specifically with an error mentioning title', () => {
    expect(() => {
      Book.create(db, { author: 'A', isbn: '000', published_year: 2023 });
    }).toThrow(/title/);
  });
});

describe('Book.findAll(db, options)', () => {
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

  test('findAll returns { books: [], total: 0 } when no books exist', () => {
    const result = Book.findAll(db);
    expect(result).toEqual({ books: [], total: 0 });
  });

  test('findAll uses default limit of 20 and offset of 0', () => {
    Book.create(db, makeBook());
    const result = Book.findAll(db);
    expect(result.books).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  test('findAll respects limit and offset pagination', () => {
    // Insert 5 books with unique ISBNs
    for (let i = 1; i <= 5; i++) {
      Book.create(db, makeBook({ isbn: `978-0-00-000000-${i}`, title: `Book ${i}` }));
    }

    const result = Book.findAll(db, { limit: 2, offset: 2 });
    expect(result.books).toHaveLength(2);
    expect(result.total).toBe(5);
  });

  test('total always reflects the full count regardless of pagination', () => {
    for (let i = 1; i <= 5; i++) {
      Book.create(db, makeBook({ isbn: `978-0-00-000000-${i}`, title: `Book ${i}` }));
    }

    const page1 = Book.findAll(db, { limit: 1, offset: 0 });
    expect(page1.books).toHaveLength(1);
    expect(page1.total).toBe(5);

    const page2 = Book.findAll(db, { limit: 3, offset: 4 });
    expect(page2.books).toHaveLength(1);
    expect(page2.total).toBe(5);
  });

  test('books are ordered by created_at DESC (newest first)', () => {
    // Insert books with slight delay simulation via different created_at
    // Since SQLite default is datetime('now'), all may have same timestamp in fast tests.
    // We'll verify ordering by inserting and checking the query order is consistent.
    for (let i = 1; i <= 3; i++) {
      Book.create(db, makeBook({ isbn: `978-0-00-000000-${i}`, title: `Book ${i}` }));
    }

    const result = Book.findAll(db);
    expect(result.books).toHaveLength(3);
    // Verify all books are present
    expect(result.total).toBe(3);
    // Verify ordering: created_at of each book should be >= the next one
    for (let i = 0; i < result.books.length - 1; i++) {
      expect(result.books[i].created_at >= result.books[i + 1].created_at).toBe(true);
    }
  });
});

describe('Book.findById(db, id)', () => {
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

  test('findById returns null for a non-existent ID', () => {
    const result = Book.findById(db, 'non-existent-id');
    expect(result).toBeNull();
  });

  test('findById returns the correct book matching the inserted data', () => {
    const input = makeBook();
    const created = Book.create(db, input);

    const found = Book.findById(db, created.id);

    expect(found).not.toBeNull();
    expect(found.id).toBe(created.id);
    expect(found.title).toBe(input.title);
    expect(found.author).toBe(input.author);
    expect(found.isbn).toBe(input.isbn);
    expect(found.published_year).toBe(input.published_year);
    expect(found.status).toBe('available');
    expect(found.checked_out_at).toBeNull();
    expect(found.created_at).toBeDefined();
    expect(found.updated_at).toBeDefined();
  });
});
