import express, { Express } from 'express';
import cors from 'cors';
import { DB } from './db/connection';
import { createActivityTypesRouter } from './routes/activityTypes.routes';
import { createTimeEntriesRouter } from './routes/timeEntries.routes';
import { createTotalsRouter } from './routes/totals.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

/** Builds the Express app against a given DB connection — lets tests inject an in-memory DB. */
export function createApp(db: DB): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/activity-types', createActivityTypesRouter(db));
  app.use('/api/time-entries', createTimeEntriesRouter(db));
  app.use('/api/totals', createTotalsRouter(db));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
