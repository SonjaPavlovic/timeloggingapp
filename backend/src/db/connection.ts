/// <reference path="../types/node-sqlite.d.ts" />
import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

export type DB = DatabaseSync;

/**
 * Single shared connection factory. Every consumer (app, migrate script,
 * seed script, tests) must go through this so PRAGMA foreign_keys = ON is
 * never accidentally skipped on a connection — SQLite defaults it OFF,
 * which would silently void every ON DELETE RESTRICT guarantee.
 *
 * Uses Node's built-in `node:sqlite` module (synchronous, no native build
 * step required) rather than a third-party driver.
 */
export function createConnection(dbPath: string): DB {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

export function defaultDbPath(): string {
  return process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'timelog.db');
}
