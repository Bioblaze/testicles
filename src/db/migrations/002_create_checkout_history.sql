CREATE TABLE IF NOT EXISTS checkout_history (
  id        TEXT    PRIMARY KEY,
  book_id   TEXT    NOT NULL REFERENCES books(id),
  action    TEXT    NOT NULL,
  timestamp TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_checkout_history_book_id
  ON checkout_history(book_id);
