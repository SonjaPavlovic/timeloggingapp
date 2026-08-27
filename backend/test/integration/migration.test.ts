import { createConnection } from '../../src/db/connection';
import { runMigration } from '../../src/db/migrate';
import { runSeed } from '../../src/db/seed';
import { STARTER_ACTIVITY_TYPES } from '../../src/db/seed';

describe('Migration and seed idempotency', () => {
  it('running the schema migration twice against the same connection succeeds', () => {
    const db = createConnection(':memory:');
    expect(() => runMigration(db)).not.toThrow();
    expect(() => runMigration(db)).not.toThrow();

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    expect(tables.map((t) => t.name)).toEqual(expect.arrayContaining(['activity_type', 'time_entry']));
  });

  it('running the seed script twice does not create duplicate activity types', () => {
    const db = createConnection(':memory:');
    runMigration(db);
    runSeed(db);
    runSeed(db);

    const rows = db.prepare('SELECT name FROM activity_type').all() as { name: string }[];
    expect(rows.length).toBe(STARTER_ACTIVITY_TYPES.length);
  });
});
