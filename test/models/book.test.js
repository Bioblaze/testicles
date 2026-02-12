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
