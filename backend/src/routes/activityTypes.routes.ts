import { Router } from 'express';
import { DB } from '../db/connection';
import * as service from '../services/activityType.service';
import { asyncHandler } from './asyncHandler';

export function createActivityTypesRouter(db: DB): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const items = service.listActivityTypes(db);
      res.status(200).json({ items, count: items.length });
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const item = service.getActivityType(db, Number(req.params.id));
      res.status(200).json(item);
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const created = service.createActivityType(db, req.body);
      res.status(201).location(`/api/activity-types/${created.id}`).json(created);
    }),
  );

  router.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const updated = service.updateActivityType(db, Number(req.params.id), req.body);
      res.status(200).json(updated);
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      service.deleteActivityType(db, Number(req.params.id));
      res.status(204).send();
    }),
  );

  return router;
}
