import fs from 'fs';
import path from 'path';
import { createConnection, defaultDbPath, DB } from './connection';

/** Applies schema.sql to the given connection. Idempotent — safe to call twice. */
export function runMigration(db: DB): void {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
}

if (require.main === module) {
  const db = createConnection(defaultDbPath());
  runMigration(db);
  console.log(`Migration applied to ${defaultDbPath()}`);
  db.close();
}
