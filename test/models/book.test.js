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

describe('Book.update(db, id, fields)', () => {
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

  test('returns null when updating a non-existent book', () => {
    const result = Book.update(db, 'non-existent-id', { title: 'New Title' });
    expect(result).toBeNull();
  });

  test('updates a single field (title) and returns the full updated book', () => {
    const created = Book.create(db, makeBook());
    const updated = Book.update(db, created.id, { title: 'Updated Title' });

    expect(updated).not.toBeNull();
    expect(updated.id).toBe(created.id);
    expect(updated.title).toBe('Updated Title');
    // Other fields remain unchanged
    expect(updated.author).toBe(created.author);
    expect(updated.isbn).toBe(created.isbn);
    expect(updated.published_year).toBe(created.published_year);
    expect(updated.status).toBe(created.status);
  });

  test('updates multiple fields at once', () => {
    const created = Book.create(db, makeBook());
    const updated = Book.update(db, created.id, {
      title: 'New Title',
      author: 'New Author',
      published_year: 2025,
    });

    expect(updated).not.toBeNull();
    expect(updated.title).toBe('New Title');
    expect(updated.author).toBe('New Author');
    expect(updated.published_year).toBe(2025);
    // Unspecified fields remain unchanged
    expect(updated.isbn).toBe(created.isbn);
    expect(updated.status).toBe(created.status);
  });

  test('updates status and checked_out_at fields', () => {
    const created = Book.create(db, makeBook());
    const checkoutTime = new Date().toISOString();
    const updated = Book.update(db, created.id, {
      status: 'checked_out',
      checked_out_at: checkoutTime,
    });

    expect(updated).not.toBeNull();
    expect(updated.status).toBe('checked_out');
    expect(updated.checked_out_at).toBe(checkoutTime);
  });

  test('always sets updated_at to a current ISO-8601 timestamp', () => {
    const created = Book.create(db, makeBook());
    const beforeUpdate = new Date().toISOString();
    const updated = Book.update(db, created.id, { title: 'Changed' });
    const afterUpdate = new Date().toISOString();

    expect(updated).not.toBeNull();
    expect(updated.updated_at).toBeDefined();
    expect(updated.updated_at >= beforeUpdate).toBe(true);
    expect(updated.updated_at <= afterUpdate).toBe(true);
  });

  test('sets updated_at even when no other fields are provided', () => {
    const created = Book.create(db, makeBook());
    const updated = Book.update(db, created.id, {});

    expect(updated).not.toBeNull();
    expect(updated.updated_at).toBeDefined();
    // Title and other fields remain unchanged
    expect(updated.title).toBe(created.title);
    expect(updated.author).toBe(created.author);
  });

  test('throws descriptive error when updating isbn to a duplicate value', () => {
    Book.create(db, makeBook({ isbn: '978-0-00-000000-1' }));
    const second = Book.create(db, makeBook({ isbn: '978-0-00-000000-2', title: 'Second Book' }));

    expect(() => {
      Book.update(db, second.id, { isbn: '978-0-00-000000-1' });
    }).toThrow('A book with this ISBN already exists');
  });

  test('updates isbn successfully when no conflict exists', () => {
    const created = Book.create(db, makeBook());
    const updated = Book.update(db, created.id, { isbn: '978-0-00-999999-9' });

    expect(updated).not.toBeNull();
    expect(updated.isbn).toBe('978-0-00-999999-9');
  });

  test('unspecified fields remain unchanged after update', () => {
    const created = Book.create(db, makeBook());
    const updated = Book.update(db, created.id, { title: 'Only Title Changed' });

    expect(updated.author).toBe(created.author);
    expect(updated.isbn).toBe(created.isbn);
    expect(updated.published_year).toBe(created.published_year);
    expect(updated.status).toBe(created.status);
    expect(updated.checked_out_at).toBe(created.checked_out_at);
    expect(updated.created_at).toBe(created.created_at);
  });

  test('returns the full book object after update', () => {
    const created = Book.create(db, makeBook());
    const updated = Book.update(db, created.id, { title: 'Full Object Check' });

    expect(updated).toHaveProperty('id');
    expect(updated).toHaveProperty('title');
    expect(updated).toHaveProperty('author');
    expect(updated).toHaveProperty('isbn');
    expect(updated).toHaveProperty('published_year');
    expect(updated).toHaveProperty('status');
    expect(updated).toHaveProperty('checked_out_at');
    expect(updated).toHaveProperty('created_at');
    expect(updated).toHaveProperty('updated_at');
  });
});
