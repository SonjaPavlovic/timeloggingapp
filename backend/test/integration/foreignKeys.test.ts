import { freshDb } from '../helpers/testApp';

describe('Foreign key enforcement (DB level, not just app pre-check)', () => {
  it('rejects a raw INSERT with a non-existent activity_type_id', () => {
    const db = freshDb();
    expect(() =>
      db
        .prepare(
          'INSERT INTO time_entry (activity_type_id, description, entry_date, start_time, end_time) VALUES (?,?,?,?,?)',
        )
        .run(999, 'orphan', '2026-01-15', '09:00:00', '10:00:00'),
    ).toThrow(/FOREIGN KEY/i);
  });

  it('rejects a raw DELETE of an activity_type still referenced by a time_entry', () => {
    const db = freshDb();
    db.prepare('INSERT INTO activity_type (name) VALUES (?)').run('Development');
    db.prepare(
      'INSERT INTO time_entry (activity_type_id, description, entry_date, start_time, end_time) VALUES (?,?,?,?,?)',
    ).run(1, 'work', '2026-01-15', '09:00:00', '10:00:00');

    expect(() => db.prepare('DELETE FROM activity_type WHERE id = ?').run(1)).toThrow(/FOREIGN KEY/i);
  });

  it('rejects a raw INSERT where end_time equals start_time (zero-length CHECK)', () => {
    const db = freshDb();
    db.prepare('INSERT INTO activity_type (name) VALUES (?)').run('Development');
    expect(() =>
      db
        .prepare(
          'INSERT INTO time_entry (activity_type_id, description, entry_date, start_time, end_time) VALUES (?,?,?,?,?)',
        )
        .run(1, 'zero', '2026-01-15', '09:00:00', '09:00:00'),
    ).toThrow(/CHECK/i);
  });
});
