import { Express } from 'express';
import { createApp } from '../../src/app';
import { createConnection, DB } from '../../src/db/connection';
import { runMigration } from '../../src/db/migrate';
import { runSeed } from '../../src/db/seed';

/** Fresh in-memory DB, migrated (and optionally seeded), per test — no state leaks between tests. */
export function freshDb(opts: { seed?: boolean } = {}): DB {
  const db = createConnection(':memory:');
  runMigration(db);
  if (opts.seed) runSeed(db);
  return db;
}

export function freshApp(opts: { seed?: boolean } = {}): { app: Express; db: DB } {
  const db = freshDb(opts);
  return { app: createApp(db), db };
}
