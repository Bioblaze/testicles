const express = require('express');
const healthRouter = require('./routes/health');
const { getDatabase } = require('./db/connection');
const { migrate } = require('./db/migrate');
const booksRouter = require('./routes/books');

const db = getDatabase();
migrate(db);

const app = express();

app.locals.db = db;

app.use(express.json());
app.use('/', healthRouter);
app.use('/books', booksRouter);

app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = app;
