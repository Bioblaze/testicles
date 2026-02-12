class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

class BookNotFoundError extends AppError {
  constructor(message = 'Book not found') {
    super(message, 404);
  }
}

class BookUnavailableError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

module.exports = { AppError, BookNotFoundError, BookUnavailableError };
