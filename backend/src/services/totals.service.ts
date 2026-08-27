import { DB } from '../db/connection';
import * as repo from '../repositories/timeEntry.repository';
import { calculateDurationMinutes } from './duration';
import { validateDateRange } from './validators';
import { validationError } from '../errors';

export interface DayTotal {
  date: string;
  totalMinutes: number;
  entryCount: number;
}

export interface ActivityTotal {
  activityTypeId: number;
  activityTypeName: string;
  totalMinutes: number;
  entryCount: number;
}

interface RangeQuery {
  from?: unknown;
  to?: unknown;
}

function validatedRange(query: RangeQuery) {
  const errors = validateDateRange(query);
  if (errors.length > 0) throw validationError(errors);
  return {
    from: typeof query.from === 'string' ? query.from : undefined,
    to: typeof query.to === 'string' ? query.to : undefined,
  };
}

/**
 * Totals are grouped/summed in application code rather than pure SQL SUM,
 * because per-row duration depends on the rollover rule (see duration.ts).
 * The query itself still does the filtering (date range, index-backed), so
 * this never loads more than the relevant rows — only the per-row duration
 * math and the grouping happen in JS, reusing the same tested function used
 * for single-entry duration.
 */
export function totalsByDay(db: DB, query: RangeQuery): { items: DayTotal[]; grandTotalMinutes: number } {
  const range = validatedRange(query);
  const rows = repo.findAll(db, range);

  const byDate = new Map<string, { totalMinutes: number; entryCount: number }>();
  for (const row of rows) {
    const minutes = calculateDurationMinutes(row.start_time, row.end_time);
    const existing = byDate.get(row.entry_date) ?? { totalMinutes: 0, entryCount: 0 };
    existing.totalMinutes += minutes;
    existing.entryCount += 1;
    byDate.set(row.entry_date, existing);
  }

  const items: DayTotal[] = Array.from(byDate.entries())
    .map(([date, v]) => ({ date, totalMinutes: v.totalMinutes, entryCount: v.entryCount }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const grandTotalMinutes = items.reduce((sum, item) => sum + item.totalMinutes, 0);
  return { items, grandTotalMinutes };
}

export function totalsByActivity(
  db: DB,
  query: RangeQuery,
): { items: ActivityTotal[]; grandTotalMinutes: number } {
  const range = validatedRange(query);
  const rows = repo.findAll(db, range);

  const byType = new Map<number, { name: string; totalMinutes: number; entryCount: number }>();
  for (const row of rows) {
    const minutes = calculateDurationMinutes(row.start_time, row.end_time);
    const existing = byType.get(row.activity_type_id) ?? {
      name: row.activity_type_name,
      totalMinutes: 0,
      entryCount: 0,
    };
    existing.totalMinutes += minutes;
    existing.entryCount += 1;
    byType.set(row.activity_type_id, existing);
  }

  const items: ActivityTotal[] = Array.from(byType.entries())
    .map(([activityTypeId, v]) => ({
      activityTypeId,
      activityTypeName: v.name,
      totalMinutes: v.totalMinutes,
      entryCount: v.entryCount,
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  const grandTotalMinutes = items.reduce((sum, item) => sum + item.totalMinutes, 0);
  return { items, grandTotalMinutes };
}
