const { Router } = require('express');
const { body, query, param } = require('express-validator');
const validate = require('../middleware/validate');
const Book = require('../models/book');

const router = Router();

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

module.exports = router;
