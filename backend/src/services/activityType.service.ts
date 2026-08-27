import { DB } from '../db/connection';
import * as repo from '../repositories/activityType.repository';
import { ActivityType } from '../types';
import { validateActivityTypeShape } from './validators';
import { duplicateNameError, inUseError, notFoundError, validationError } from '../errors';

function toApi(row: repo.ActivityTypeRow): ActivityType {
  return { id: row.id, name: row.name };
}

export function listActivityTypes(db: DB): ActivityType[] {
  return repo.findAll(db).map(toApi);
}

export function getActivityType(db: DB, id: number): ActivityType {
  const row = repo.findById(db, id);
  if (!row) throw notFoundError(`Activity type ${id} not found`);
  return toApi(row);
}

export function createActivityType(db: DB, body: unknown): ActivityType {
  const input = (body ?? {}) as { name?: unknown };
  const errors = validateActivityTypeShape(input);
  if (errors.length > 0) throw validationError(errors);

  const name = String(input.name);
  if (repo.findByNameCaseInsensitive(db, name)) {
    throw duplicateNameError(`Activity type "${name.trim()}" already exists`);
  }

  return toApi(repo.create(db, name));
}

export function updateActivityType(db: DB, id: number, body: unknown): ActivityType {
  const existing = repo.findById(db, id);
  if (!existing) throw notFoundError(`Activity type ${id} not found`);

  const input = (body ?? {}) as { name?: unknown };
  const errors = validateActivityTypeShape(input);
  if (errors.length > 0) throw validationError(errors);

  const name = String(input.name);
  const collision = repo.findByNameCaseInsensitive(db, name);
  if (collision && collision.id !== id) {
    throw duplicateNameError(`Activity type "${name.trim()}" already exists`);
  }

  return toApi(repo.update(db, id, name) as repo.ActivityTypeRow);
}

export function deleteActivityType(db: DB, id: number): void {
  const existing = repo.findById(db, id);
  if (!existing) throw notFoundError(`Activity type ${id} not found`);

  if (repo.countEntriesForType(db, id) > 0) {
    throw inUseError(`Activity type ${id} is referenced by one or more time entries`);
  }

  repo.remove(db, id);
}
