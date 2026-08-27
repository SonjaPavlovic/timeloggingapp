import { DB } from '../db/connection';

export interface TimeEntryRow {
  id: number;
  activity_type_id: number;
  activity_type_name: string;
  description: string;
  entry_date: string;
  start_time: string;
  end_time: string;
}

export interface TimeEntryFilter {
  from?: string;
  to?: string;
  activityTypeId?: number;
}

const SELECT_BASE = `
  SELECT
    te.id as id,
    te.activity_type_id as activity_type_id,
    at.name as activity_type_name,
    te.description as description,
    te.entry_date as entry_date,
    te.start_time as start_time,
    te.end_time as end_time
  FROM time_entry te
  JOIN activity_type at ON at.id = te.activity_type_id
`;

function buildWhere(filter: TimeEntryFilter): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.from) {
    conditions.push('te.entry_date >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    conditions.push('te.entry_date <= ?');
    params.push(filter.to);
  }
  if (filter.activityTypeId !== undefined) {
    conditions.push('te.activity_type_id = ?');
    params.push(filter.activityTypeId);
  }

  return conditions.length > 0 ? { clause: `WHERE ${conditions.join(' AND ')}`, params } : { clause: '', params };
}

export function findAll(db: DB, filter: TimeEntryFilter = {}): TimeEntryRow[] {
  const { clause, params } = buildWhere(filter);
  const sql = `${SELECT_BASE} ${clause} ORDER BY te.entry_date DESC, te.start_time DESC`;
  return db.prepare(sql).all(...params) as unknown as TimeEntryRow[];
}

export function findById(db: DB, id: number): TimeEntryRow | undefined {
  return db.prepare(`${SELECT_BASE} WHERE te.id = ?`).get(id) as TimeEntryRow | undefined;
}

export interface TimeEntryWrite {
  activityTypeId: number;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
}

export function create(db: DB, input: TimeEntryWrite): TimeEntryRow {
  const result = db
    .prepare(
      `INSERT INTO time_entry (activity_type_id, description, entry_date, start_time, end_time)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(input.activityTypeId, input.description, input.date, input.startTime, input.endTime);
  return findById(db, Number(result.lastInsertRowid)) as TimeEntryRow;
}

export function update(db: DB, id: number, input: TimeEntryWrite): TimeEntryRow | undefined {
  db.prepare(
    `UPDATE time_entry
     SET activity_type_id = ?, description = ?, entry_date = ?, start_time = ?, end_time = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
  ).run(input.activityTypeId, input.description, input.date, input.startTime, input.endTime, id);
  return findById(db, id);
}

export function remove(db: DB, id: number): void {
  db.prepare('DELETE FROM time_entry WHERE id = ?').run(id);
}
