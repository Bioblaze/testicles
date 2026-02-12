const Database = require('better-sqlite3');

function getDatabase(filepath) {
  const defaultPath = process.env.NODE_ENV === 'test'
    ? ':memory:'
    : (process.env.DB_PATH || './data/books.db');

  const dbPath = filepath || defaultPath;
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}

module.exports = { getDatabase };
