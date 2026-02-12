const { AppError, BookNotFoundError, BookUnavailableError } = require('../src/errors');

describe('AppError', () => {
  test('extends Error', () => {
    const err = new AppError('test', 500);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  test('sets name, message, and statusCode correctly', () => {
    const err = new AppError('test', 500);
    expect(err.name).toBe('AppError');
    expect(err.message).toBe('test');
    expect(err.statusCode).toBe(500);
  });
});

describe('BookNotFoundError', () => {
  test('extends AppError and Error', () => {
    const err = new BookNotFoundError();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(BookNotFoundError);
  });

  test('defaults message to "Book not found" and statusCode to 404', () => {
    const err = new BookNotFoundError();
    expect(err.name).toBe('BookNotFoundError');
    expect(err.message).toBe('Book not found');
    expect(err.statusCode).toBe(404);
  });

  test('accepts a custom message while keeping statusCode 404', () => {
    const err = new BookNotFoundError('Custom message');
    expect(err.message).toBe('Custom message');
    expect(err.statusCode).toBe(404);
  });
});

describe('BookUnavailableError', () => {
  test('extends AppError and Error', () => {
    const err = new BookUnavailableError('reason');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(BookUnavailableError);
  });

  test('sets name, message, and statusCode to 409', () => {
    const err = new BookUnavailableError('Book is already checked out');
    expect(err.name).toBe('BookUnavailableError');
    expect(err.message).toBe('Book is already checked out');
    expect(err.statusCode).toBe(409);
  });
});
