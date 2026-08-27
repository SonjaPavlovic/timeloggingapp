import request from 'supertest';
import { freshApp } from '../helpers/testApp';

describe('Activity Types API', () => {
  it('GET /api/activity-types returns 200 with items sorted by name asc', async () => {
    const { app, db } = freshApp();
    db.prepare('INSERT INTO activity_type (name) VALUES (?)').run('Support');
    db.prepare('INSERT INTO activity_type (name) VALUES (?)').run('Admin');

    const res = await request(app).get('/api/activity-types');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.items.map((i: any) => i.name)).toEqual(['Admin', 'Support']);
  });

  it('POST /api/activity-types creates and returns 201 with id and Location header', async () => {
    const { app } = freshApp();
    const res = await request(app).post('/api/activity-types').send({ name: 'Development' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Development');
    expect(res.body.id).toBeDefined();
    expect(res.headers.location).toBe(`/api/activity-types/${res.body.id}`);
  });

  it('POST with missing/empty/whitespace-only name returns 400', async () => {
    const { app } = freshApp();
    for (const name of [undefined, '', '   ']) {
      const res = await request(app).post('/api/activity-types').send({ name });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    }
  });

  it('POST with a name over 100 characters returns 400', async () => {
    const { app } = freshApp();
    const res = await request(app).post('/api/activity-types').send({ name: 'x'.repeat(101) });
    expect(res.status).toBe(400);
  });

  it('POST with a duplicate name (case-insensitive, whitespace-trimmed) returns 409 and inserts nothing', async () => {
    const { app } = freshApp();
    await request(app).post('/api/activity-types').send({ name: 'Development' });

    const res = await request(app).post('/api/activity-types').send({ name: '  development  ' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_NAME');

    const list = await request(app).get('/api/activity-types');
    expect(list.body.count).toBe(1);
  });

  it('POST stores and returns the name trimmed', async () => {
    const { app } = freshApp();
    const res = await request(app).post('/api/activity-types').send({ name: '  Meetings  ' });
    expect(res.body.name).toBe('Meetings');
  });

  it('PUT renames a type, returns 200, and the new name is reflected on time entries using it', async () => {
    const { app } = freshApp();
    const created = await request(app).post('/api/activity-types').send({ name: 'Old Name' });
    const id = created.body.id;

    const entry = await request(app).post('/api/time-entries').send({
      activityTypeId: id,
      description: 'work',
      date: '2026-01-15',
      startTime: '09:00:00',
      endTime: '10:00:00',
    });
    expect(entry.status).toBe(201);

    const renamed = await request(app).put(`/api/activity-types/${id}`).send({ name: 'New Name' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe('New Name');

    const entries = await request(app).get('/api/time-entries');
    expect(entries.body.items[0].activityType.name).toBe('New Name');
  });

  it('PUT renaming to a name held by a different type returns 409', async () => {
    const { app } = freshApp();
    await request(app).post('/api/activity-types').send({ name: 'Alpha' });
    const beta = await request(app).post('/api/activity-types').send({ name: 'Beta' });

    const res = await request(app).put(`/api/activity-types/${beta.body.id}`).send({ name: 'Alpha' });
    expect(res.status).toBe(409);
  });

  it('PUT renaming a type to its own current name returns 200', async () => {
    const { app } = freshApp();
    const created = await request(app).post('/api/activity-types').send({ name: 'Alpha' });
    const res = await request(app).put(`/api/activity-types/${created.body.id}`).send({ name: 'Alpha' });
    expect(res.status).toBe(200);
  });

  it('DELETE with no referencing entries returns 204 and removes the row', async () => {
    const { app } = freshApp();
    const created = await request(app).post('/api/activity-types').send({ name: 'Alpha' });
    const res = await request(app).delete(`/api/activity-types/${created.body.id}`);
    expect(res.status).toBe(204);

    const get = await request(app).get(`/api/activity-types/${created.body.id}`);
    expect(get.status).toBe(404);
  });

  it('DELETE while referenced by a time entry returns 409 IN_USE and deletes nothing', async () => {
    const { app } = freshApp();
    const created = await request(app).post('/api/activity-types').send({ name: 'Alpha' });
    const id = created.body.id;
    await request(app).post('/api/time-entries').send({
      activityTypeId: id,
      description: 'work',
      date: '2026-01-15',
      startTime: '09:00:00',
      endTime: '10:00:00',
    });

    const res = await request(app).delete(`/api/activity-types/${id}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('IN_USE');

    const get = await request(app).get(`/api/activity-types/${id}`);
    expect(get.status).toBe(200);

    const entries = await request(app).get('/api/time-entries');
    expect(entries.body.count).toBe(1);
  });

  it('GET/PUT/DELETE on an unknown id returns 404', async () => {
    const { app } = freshApp();
    expect((await request(app).get('/api/activity-types/999')).status).toBe(404);
    expect((await request(app).put('/api/activity-types/999').send({ name: 'X' })).status).toBe(404);
    expect((await request(app).delete('/api/activity-types/999')).status).toBe(404);
  });
});
