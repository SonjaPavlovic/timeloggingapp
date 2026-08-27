import { Router } from 'express';
import { DB } from '../db/connection';
import * as service from '../services/totals.service';
import { asyncHandler } from './asyncHandler';

export function createTotalsRouter(db: DB): Router {
  const router = Router();

  router.get(
    '/by-day',
    asyncHandler(async (req, res) => {
      const result = service.totalsByDay(db, req.query);
      res.status(200).json(result);
    }),
  );

  router.get(
    '/by-activity',
    asyncHandler(async (req, res) => {
      const result = service.totalsByActivity(db, req.query);
      res.status(200).json(result);
    }),
  );

  return router;
}
