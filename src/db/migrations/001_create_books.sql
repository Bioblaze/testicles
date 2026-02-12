CREATE TABLE IF NOT EXISTS books (
  id              TEXT    PRIMARY KEY,
  title           TEXT    NOT NULL,
  author          TEXT    NOT NULL,
  isbn            TEXT    NOT NULL UNIQUE,
  published_year  INTEGER NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'available',
  checked_out_at  TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
