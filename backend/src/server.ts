import { createApp } from './app';
import { createConnection, defaultDbPath } from './db/connection';
import { runMigration } from './db/migrate';
import { runSeed } from './db/seed';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const db = createConnection(defaultDbPath());
runMigration(db);
runSeed(db);

const app = createApp(db);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Time Logging API listening on http://localhost:${PORT}`);
});
