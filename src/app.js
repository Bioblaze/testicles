const express = require('express');
const healthRouter = require('./routes/health');

const app = express();

app.use(express.json());
app.use('/', healthRouter);

app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = app;
