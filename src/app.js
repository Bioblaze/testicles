const express = require('express');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const logger = require('./logger');
const healthRouter = require('./routes/health');
const { getDatabase } = require('./db/connection');
const { migrate } = require('./db/migrate');
const booksRouter = require('./routes/books');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const db = getDatabase();
migrate(db);

const app = express();

app.locals.db = db;

// 1. Security headers — must be first so headers are set on every response
app.use(helmet());

// 2. Structured request/response logging
app.use(pinoHttp({ logger }));

// 3. Body parsing — catches malformed JSON
app.use(express.json());

// 4. Rate limiting — after body parsing, before routes
app.use(rateLimiter);

// 5. Routes
app.use('/', healthRouter);
app.use('/books', booksRouter);

// 6. 404 catch-all — after all routes, before error handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});

// 7. Centralized error handler — MUST be the absolute last middleware
app.use(errorHandler);

module.exports = app;
