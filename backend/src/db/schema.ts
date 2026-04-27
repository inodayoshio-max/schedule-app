import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/schedule.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initDb(db);
  }
  return db;
}

function initDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT,
      host_name   TEXT NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS slots (
      id           TEXT PRIMARY KEY,
      event_id     TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      datetime     TEXT NOT NULL,
      meeting_type TEXT NOT NULL DEFAULT 'face'
        CHECK(meeting_type IN ('face', 'online', 'either'))
    );

    CREATE TABLE IF NOT EXISTS responses (
      id               TEXT PRIMARY KEY,
      event_id         TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      customer_name    TEXT NOT NULL,
      customer_email   TEXT,
      response_type    TEXT NOT NULL CHECK(response_type IN ('selected', 'proposed')),
      selected_slot_id TEXT REFERENCES slots(id),
      meeting_format   TEXT CHECK(meeting_format IN ('face', 'online')),
      meeting_url      TEXT,
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS proposed_dates (
      id          TEXT PRIMARY KEY,
      response_id TEXT NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
      datetime    TEXT NOT NULL
    );
  `);
}
