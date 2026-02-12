const errorHandler = require('../../src/middleware/errorHandler');
const { AppError, BookNotFoundError, BookUnavailableError } = require('../../src/errors');
const logger = require('../../src/logger');

// Mock the logger to verify logging calls
jest.mock('../../src/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('errorHandler middleware (src/middleware/errorHandler.js)', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('exports a function', () => {
    expect(typeof errorHandler).toBe('function');
  });

  test('has four-argument (err, req, res, next) arity', () => {
    expect(errorHandler.length).toBe(4);
  });

  describe('AppError instances', () => {
    test('responds with the correct statusCode and error message', () => {
      const err = new AppError('Something went wrong', 422);

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({ error: 'Something went wrong' });
    });

    test('logs at warn level with err and statusCode', () => {
      const err = new AppError('Bad input', 400);

      errorHandler(err, req, res, next);

      expect(logger.warn).toHaveBeenCalledWith(
        { err, statusCode: 400 },
        'Bad input'
      );
    });

    test('handles BookNotFoundError (AppError subclass) with 404', () => {
      const err = new BookNotFoundError();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Book not found' });
      expect(logger.warn).toHaveBeenCalledWith(
        { err, statusCode: 404 },
        'Book not found'
      );
    });

    test('handles BookUnavailableError (AppError subclass) with 409', () => {
      const err = new BookUnavailableError('Book is already checked out');

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'Book is already checked out' });
      expect(logger.warn).toHaveBeenCalledWith(
        { err, statusCode: 409 },
        'Book is already checked out'
      );
    });

    test('does not log at error level for AppError instances', () => {
      const err = new AppError('Known error', 400);

      errorHandler(err, req, res, next);

      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('JSON parse errors (entity.parse.failed)', () => {
    test('responds with 400 and "Malformed JSON in request body"', () => {
      const err = new SyntaxError('Unexpected token');
      err.type = 'entity.parse.failed';

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Malformed JSON in request body' });
    });

    test('does not log at error level for JSON parse errors', () => {
      const err = new SyntaxError('Unexpected token');
      err.type = 'entity.parse.failed';

      errorHandler(err, req, res, next);

      expect(logger.error).not.toHaveBeenCalled();
    });

    test('does not log at warn level for JSON parse errors', () => {
      const err = new SyntaxError('Unexpected token');
      err.type = 'entity.parse.failed';

      errorHandler(err, req, res, next);

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('unknown/unexpected errors', () => {
    test('responds with 500 and generic "Internal server error"', () => {
      const err = new Error('Something broke internally');

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    test('does not leak the original error message to the client', () => {
      const err = new Error('secret database credentials exposed');

      errorHandler(err, req, res, next);

      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody.error).toBe('Internal server error');
      expect(responseBody.error).not.toContain('secret');
    });

    test('does not leak stack traces to the client', () => {
      const err = new Error('internal failure');

      errorHandler(err, req, res, next);

      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody.stack).toBeUndefined();
      expect(JSON.stringify(responseBody)).not.toContain('at ');
    });

    test('logs the full error at error level via Pino', () => {
      const err = new Error('Unexpected failure');

      errorHandler(err, req, res, next);

      expect(logger.error).toHaveBeenCalledWith(
        { err, stack: err.stack },
        'Unhandled error'
      );
    });

    test('does not log at warn level for unknown errors', () => {
      const err = new Error('Unknown');

      errorHandler(err, req, res, next);

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('consistent response shape', () => {
    test('AppError response has only "error" key', () => {
      const err = new AppError('Test', 400);
      errorHandler(err, req, res, next);
      const body = res.json.mock.calls[0][0];
      expect(Object.keys(body)).toEqual(['error']);
      expect(typeof body.error).toBe('string');
    });

    test('JSON parse error response has only "error" key', () => {
      const err = new SyntaxError('bad json');
      err.type = 'entity.parse.failed';
      errorHandler(err, req, res, next);
      const body = res.json.mock.calls[0][0];
      expect(Object.keys(body)).toEqual(['error']);
      expect(typeof body.error).toBe('string');
    });

    test('unknown error response has only "error" key', () => {
      const err = new Error('boom');
      errorHandler(err, req, res, next);
      const body = res.json.mock.calls[0][0];
      expect(Object.keys(body)).toEqual(['error']);
      expect(typeof body.error).toBe('string');
    });
  });
});
