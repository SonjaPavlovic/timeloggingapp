import { DB } from '../db/connection';

export interface ActivityTypeRow {
  id: number;
  name: string;
  created_at: string;
}

export function findAll(db: DB): ActivityTypeRow[] {
  return db.prepare('SELECT * FROM activity_type ORDER BY name ASC').all() as unknown as ActivityTypeRow[];
}

export function findById(db: DB, id: number): ActivityTypeRow | undefined {
  return db.prepare('SELECT * FROM activity_type WHERE id = ?').get(id) as ActivityTypeRow | undefined;
}

/** Case-insensitive, whitespace-trimmed name lookup — used for the pre-check that returns a clean 409. */
export function findByNameCaseInsensitive(db: DB, name: string): ActivityTypeRow | undefined {
  return db
    .prepare('SELECT * FROM activity_type WHERE name = ? COLLATE NOCASE')
    .get(name.trim()) as ActivityTypeRow | undefined;
}

export function create(db: DB, name: string): ActivityTypeRow {
  const trimmed = name.trim();
  const result = db.prepare('INSERT INTO activity_type (name) VALUES (?)').run(trimmed);
  return findById(db, Number(result.lastInsertRowid)) as ActivityTypeRow;
}

export function update(db: DB, id: number, name: string): ActivityTypeRow | undefined {
  const trimmed = name.trim();
  db.prepare('UPDATE activity_type SET name = ? WHERE id = ?').run(trimmed, id);
  return findById(db, id);
}

export function remove(db: DB, id: number): void {
  db.prepare('DELETE FROM activity_type WHERE id = ?').run(id);
}

export function countEntriesForType(db: DB, id: number): number {
  const row = db
    .prepare('SELECT COUNT(*) as count FROM time_entry WHERE activity_type_id = ?')
    .get(id) as { count: number };
  return row.count;
}
