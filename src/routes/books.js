const { Router } = require('express');
const { body } = require('express-validator');
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

module.exports = router;
