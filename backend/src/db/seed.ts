import { createConnection, defaultDbPath, DB } from './connection';
import { runMigration } from './migrate';

export const STARTER_ACTIVITY_TYPES = ['Development', 'Meetings', 'Support', 'Admin', 'Research'];

/** Inserts the starter activity types. Skips any name that already exists (case-insensitive). */
export function runSeed(db: DB): void {
  const insert = db.prepare('INSERT INTO activity_type (name) VALUES (?)');
  const exists = db.prepare('SELECT 1 as found FROM activity_type WHERE name = ? COLLATE NOCASE');

  db.exec('BEGIN');
  try {
    for (const name of STARTER_ACTIVITY_TYPES) {
      if (!exists.get(name)) {
        insert.run(name);
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

if (require.main === module) {
  const db = createConnection(defaultDbPath());
  runMigration(db);
  runSeed(db);
  console.log(`Seed applied to ${defaultDbPath()}`);
  db.close();
}
