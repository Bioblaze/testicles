const { Router } = require('express');
const { body, query, param } = require('express-validator');
const validate = require('../middleware/validate');
const Book = require('../models/book');
const checkoutHistory = require('../models/checkoutHistory');
const { checkoutBook, returnBook } = require('../services/checkout');
const { BookNotFoundError, BookUnavailableError } = require('../errors');

const router = Router();

/**
 * @openapi
 * /books:
 *   post:
 *     tags: [Books]
 *     summary: Create a new book
 *     description: Creates a new book record in the library. The ISBN must be unique across all books.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, author, isbn, published_year]
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *                 description: The title of the book
 *               author:
 *                 type: string
 *                 maxLength: 255
 *                 description: The author of the book
 *               isbn:
 *                 type: string
 *                 description: Valid ISBN-10 or ISBN-13
 *               published_year:
 *                 type: integer
 *                 minimum: 1000
 *                 description: The year the book was published
 *     responses:
 *       201:
 *         description: Book created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 title:
 *                   type: string
 *                 author:
 *                   type: string
 *                 isbn:
 *                   type: string
 *                 published_year:
 *                   type: integer
 *                 status:
 *                   type: string
 *                   example: available
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *       409:
 *         description: Duplicate ISBN conflict
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: A book with this ISBN already exists
 */
router.post(
  '/',
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must not exceed 255 characters'),
  body('author')
    .trim()
    .notEmpty()
    .withMessage('Author is required')
    .isLength({ max: 255 })
    .withMessage('Author must not exceed 255 characters'),
  body('isbn')
    .notEmpty()
    .withMessage('ISBN is required')
    .isISBN()
    .withMessage('ISBN must be a valid ISBN-10 or ISBN-13'),
  body('published_year')
    .isInt({ min: 1000, max: new Date().getFullYear() })
    .withMessage('Published year must be an integer between 1000 and the current year'),
  validate,
  (req, res) => {
    const { title, author, isbn, published_year } = req.body;
    const db = req.app.locals.db;

    try {
      const book = Book.create(db, { title, author, isbn, published_year });
      return res.status(201).json(book);
    } catch (err) {
      if (err.message === 'A book with this ISBN already exists') {
        return res.status(409).json({ error: 'A book with this ISBN already exists' });
      }
      throw err;
    }
  }
);

/**
 * @openapi
 * /books:
 *   get:
 *     tags: [Books]
 *     summary: List all books
 *     description: Returns a paginated list of all books in the library, ordered by creation date descending.
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of books per page
 *     responses:
 *       200:
 *         description: Paginated list of books
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                       author:
 *                         type: string
 *                       isbn:
 *                         type: string
 *                       published_year:
 *                         type: integer
 *                       status:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 */
router.get(
  '/',
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  (req, res) => {
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);

    // Fall back to defaults if missing or invalid (not a valid integer)
    page = Number.isInteger(page) && page >= 1 ? page : 1;
    limit = Number.isInteger(limit) && limit >= 1 && limit <= 100 ? limit : 20;

    const offset = (page - 1) * limit;
    const { books, total } = Book.findAll(req.app.locals.db, { limit, offset });

    return res.status(200).json({
      data: books,
      pagination: {
        page,
        limit,
        total,
      },
    });
  }
);

/**
 * @openapi
 * /books/{id}:
 *   get:
 *     tags: [Books]
 *     summary: Get a book by ID
 *     description: Returns a single book record identified by its UUID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID v4 of the book
 *     responses:
 *       200:
 *         description: Book found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 title:
 *                   type: string
 *                 author:
 *                   type: string
 *                 isbn:
 *                   type: string
 *                 published_year:
 *                   type: integer
 *                 status:
 *                   type: string
 *                 checked_out_at:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid UUID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *       404:
 *         description: Book not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Book not found
 */
router.get(
  '/:id',
  param('id').isUUID(4).withMessage('ID must be a valid UUID v4'),
  validate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const db = req.app.locals.db;
      const book = Book.findById(db, id);

      if (book === null) {
        return res.status(404).json({ error: 'Book not found' });
      }

      return res.status(200).json(book);
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @openapi
 * /books/{id}/history:
 *   get:
 *     tags: [History]
 *     summary: Get checkout history for a book
 *     description: Returns a paginated list of checkout and return events for a specific book, ordered by timestamp descending (newest first).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID v4 of the book
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of history entries per page
 *     responses:
 *       200:
 *         description: Paginated checkout history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       book_id:
 *                         type: string
 *                         format: uuid
 *                       action:
 *                         type: string
 *                         enum: [checked_out, returned]
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       400:
 *         description: Invalid UUID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *       404:
 *         description: Book not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Book not found
 */
router.get(
  '/:id/history',
  param('id').isUUID(4).withMessage('ID must be a valid UUID v4'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  validate,
  async (req, res) => {
    const { id } = req.params;
    const db = req.app.locals.db;

    const book = Book.findById(db, id);
    if (book === null) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const page = Number.isInteger(req.query.page) ? req.query.page : (parseInt(req.query.page, 10) || 1);
    const limit = Number.isInteger(req.query.limit) ? req.query.limit : (parseInt(req.query.limit, 10) || 20);
    const offset = (page - 1) * limit;

    const { entries, total } = checkoutHistory.findByBookId(db, id, { limit, offset });

    return res.status(200).json({
      data: entries,
      pagination: { page, limit, total },
    });
  }
);

/**
 * @openapi
 * /books/{id}/checkout:
 *   post:
 *     tags: [Books]
 *     summary: Check out a book
 *     description: Transitions a book from available to checked_out status. Records a checkout history entry atomically.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID v4 of the book to check out
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Book checked out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 title:
 *                   type: string
 *                 author:
 *                   type: string
 *                 isbn:
 *                   type: string
 *                 published_year:
 *                   type: integer
 *                 status:
 *                   type: string
 *                   example: checked_out
 *                 checked_out_at:
 *                   type: string
 *                   format: date-time
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid UUID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *       404:
 *         description: Book not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Book not found
 *       409:
 *         description: Book is already checked out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Book is already checked out
 */
router.post(
  '/:id/checkout',
  param('id').isUUID(4).withMessage('ID must be a valid UUID v4'),
  validate,
  (req, res) => {
    const { id } = req.params;
    const db = req.app.locals.db;

    try {
      const updatedBook = checkoutBook(db, id);
      res.json(updatedBook);
    } catch (err) {
      if (err instanceof BookNotFoundError) {
        return res.status(404).json({ error: err.message });
      }
      if (err instanceof BookUnavailableError) {
        return res.status(409).json({ error: err.message });
      }
      throw err;
    }
  }
);

/**
 * @openapi
 * /books/{id}/return:
 *   post:
 *     tags: [Books]
 *     summary: Return a book
 *     description: Transitions a book from checked_out to available status. Records a return history entry atomically.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID v4 of the book to return
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Book returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 title:
 *                   type: string
 *                 author:
 *                   type: string
 *                 isbn:
 *                   type: string
 *                 published_year:
 *                   type: integer
 *                 status:
 *                   type: string
 *                   example: available
 *                 checked_out_at:
 *                   type: string
 *                   nullable: true
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid UUID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *       404:
 *         description: Book not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Book not found
 *       409:
 *         description: Book is not currently checked out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Book is not currently checked out
 */
router.post(
  '/:id/return',
  param('id').isUUID(4).withMessage('ID must be a valid UUID v4'),
  validate,
  (req, res) => {
    const { id } = req.params;
    const db = req.app.locals.db;

    try {
      const updatedBook = returnBook(db, id);
      res.json(updatedBook);
    } catch (err) {
      if (err instanceof BookNotFoundError) {
        return res.status(404).json({ error: err.message });
      }
      if (err instanceof BookUnavailableError) {
        return res.status(409).json({ error: err.message });
      }
      throw err;
    }
  }
);

module.exports = router;
