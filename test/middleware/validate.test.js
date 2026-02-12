const express = require('express');
const request = require('supertest');
const { body } = require('express-validator');
const validate = require('../../src/middleware/validate');

describe('validate middleware (src/middleware/validate.js)', () => {
  test('exports a function', () => {
    expect(typeof validate).toBe('function');
  });

  test('has (req, res, next) arity', () => {
    expect(validate.length).toBe(3);
  });

  describe('when validation errors are present', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post(
        '/test',
        body('title').notEmpty().withMessage('Title is required'),
        body('author').notEmpty().withMessage('Author is required'),
        validate,
        (req, res) => {
          res.status(200).json({ success: true });
        }
      );
    });

    test('responds with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/test')
        .send({})
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(400);
    });

    test('returns JSON body with errors array', async () => {
      const res = await request(app)
        .post('/test')
        .send({})
        .set('Content-Type', 'application/json');
      expect(res.body).toHaveProperty('errors');
      expect(Array.isArray(res.body.errors)).toBe(true);
    });

    test('each error object has field and message properties', async () => {
      const res = await request(app)
        .post('/test')
        .send({})
        .set('Content-Type', 'application/json');
      for (const err of res.body.errors) {
        expect(err).toHaveProperty('field');
        expect(err).toHaveProperty('message');
      }
    });

    test('maps err.path to field and err.msg to message', async () => {
      const res = await request(app)
        .post('/test')
        .send({})
        .set('Content-Type', 'application/json');
      const titleError = res.body.errors.find(e => e.field === 'title');
      const authorError = res.body.errors.find(e => e.field === 'author');
      expect(titleError).toBeDefined();
      expect(titleError.message).toBe('Title is required');
      expect(authorError).toBeDefined();
      expect(authorError.message).toBe('Author is required');
    });

    test('does not call next — route handler is never reached', async () => {
      const res = await request(app)
        .post('/test')
        .send({})
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(400);
      expect(res.body.success).toBeUndefined();
    });

    test('returns errors for a single invalid field', async () => {
      const res = await request(app)
        .post('/test')
        .send({ title: 'Valid Title' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.errors[0].field).toBe('author');
      expect(res.body.errors[0].message).toBe('Author is required');
    });
  });

  describe('when no validation errors exist', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post(
        '/test',
        body('title').notEmpty().withMessage('Title is required'),
        validate,
        (req, res) => {
          res.status(200).json({ success: true });
        }
      );
    });

    test('calls next() and reaches the route handler', async () => {
      const res = await request(app)
        .post('/test')
        .send({ title: 'A Valid Title' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });
  });
});
