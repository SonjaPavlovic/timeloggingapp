-- Time Logging App schema.
-- Safe to run more than once: every statement is idempotent.

CREATE TABLE IF NOT EXISTS activity_type (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL COLLATE NOCASE UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS time_entry (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_type_id  INTEGER NOT NULL REFERENCES activity_type(id) ON DELETE RESTRICT,
  description       TEXT NOT NULL,
  entry_date        TEXT NOT NULL,
  start_time        TEXT NOT NULL,
  end_time          TEXT NOT NULL CHECK (end_time <> start_time),
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_time_entry_entry_date ON time_entry(entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entry_activity_type_id ON time_entry(activity_type_id);
