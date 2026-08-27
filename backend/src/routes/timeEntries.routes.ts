import { Router } from 'express';
import { DB } from '../db/connection';
import * as service from '../services/timeEntry.service';
import { asyncHandler } from './asyncHandler';

export function createTimeEntriesRouter(db: DB): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const result = service.listTimeEntries(db, req.query as service.ListQuery);
      res.status(200).json(result);
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const item = service.getTimeEntry(db, Number(req.params.id));
      res.status(200).json(item);
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const created = service.createTimeEntry(db, req.body);
      res.status(201).location(`/api/time-entries/${created.id}`).json(created);
    }),
  );

  router.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const updated = service.updateTimeEntry(db, Number(req.params.id), req.body);
      res.status(200).json(updated);
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      service.deleteTimeEntry(db, Number(req.params.id));
      res.status(204).send();
    }),
  );

  return router;
}
