import { DB } from '../db/connection';
import * as repo from '../repositories/timeEntry.repository';
import * as activityTypeRepo from '../repositories/activityType.repository';
import { TimeEntry } from '../types';
import { calculateDurationMinutes } from './duration';
import { validateDateRange, validateTimeEntryShape } from './validators';
import { notFoundError, validationError } from '../errors';

function toApi(row: repo.TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    activityType: { id: row.activity_type_id, name: row.activity_type_name },
    description: row.description,
    date: row.entry_date,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: calculateDurationMinutes(row.start_time, row.end_time),
  };
}

export interface ListQuery {
  from?: unknown;
  to?: unknown;
  activityTypeId?: unknown;
}

function parseActivityTypeIdFilter(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw validationError([{ field: 'activityTypeId', message: 'activityTypeId must be an integer' }]);
  }
  return n;
}

export function listTimeEntries(db: DB, query: ListQuery): { items: TimeEntry[]; count: number } {
  const errors = validateDateRange(query);
  if (errors.length > 0) throw validationError(errors);

  const activityTypeId = parseActivityTypeIdFilter(query.activityTypeId);

  const rows = repo.findAll(db, {
    from: typeof query.from === 'string' ? query.from : undefined,
    to: typeof query.to === 'string' ? query.to : undefined,
    activityTypeId,
  });
  const items = rows.map(toApi);
  return { items, count: items.length };
}

export function getTimeEntry(db: DB, id: number): TimeEntry {
  const row = repo.findById(db, id);
  if (!row) throw notFoundError(`Time entry ${id} not found`);
  return toApi(row);
}

function validateAndNormalize(db: DB, body: unknown) {
  const input = (body ?? {}) as Record<string, unknown>;
  const errors = validateTimeEntryShape(input);

  if (
    errors.length === 0 ||
    !errors.some((e) => e.field === 'activityTypeId')
  ) {
    if (typeof input.activityTypeId === 'number' && !activityTypeRepo.findById(db, input.activityTypeId)) {
      errors.push({ field: 'activityTypeId', message: `Activity type ${input.activityTypeId} does not exist` });
    }
  }

  if (errors.length > 0) throw validationError(errors);

  return {
    activityTypeId: input.activityTypeId as number,
    description: (input.description as string).trim(),
    date: input.date as string,
    startTime: input.startTime as string,
    endTime: input.endTime as string,
  };
}

export function createTimeEntry(db: DB, body: unknown): TimeEntry {
  const write = validateAndNormalize(db, body);
  return toApi(repo.create(db, write));
}

export function updateTimeEntry(db: DB, id: number, body: unknown): TimeEntry {
  const existing = repo.findById(db, id);
  if (!existing) throw notFoundError(`Time entry ${id} not found`);

  const write = validateAndNormalize(db, body);
  return toApi(repo.update(db, id, write) as repo.TimeEntryRow);
}

export function deleteTimeEntry(db: DB, id: number): void {
  const existing = repo.findById(db, id);
  if (!existing) throw notFoundError(`Time entry ${id} not found`);
  repo.remove(db, id);
}
