import request from 'supertest';
import { freshApp } from '../helpers/testApp';

async function makeType(app: any, name = 'Development') {
  const res = await request(app).post('/api/activity-types').send({ name });
  return res.body.id as number;
}

const base = {
  description: 'Implemented totals endpoint',
  date: '2026-01-15',
  startTime: '09:00:00',
  endTime: '10:30:00',
};

describe('Time Entries API', () => {
  it('POST creates a valid entry: 201, Location header, id, durationMinutes, activityType object', async () => {
    const { app } = freshApp();
    const typeId = await makeType(app);

    const res = await request(app).post('/api/time-entries').send({ ...base, activityTypeId: typeId });
    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/time-entries/${res.body.id}`);
    expect(res.body.durationMinutes).toBe(90);
    expect(res.body.activityType).toEqual({ id: typeId, name: 'Development' });
  });

  it('created entry is persisted and GET by id returns the same values', async () => {
    const { app } = freshApp();
    const typeId = await makeType(app);
    const created = await request(app).post('/api/time-entries').send({ ...base, activityTypeId: typeId });

    const res = await request(app).get(`/api/time-entries/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(created.body);
  });

  it('POST omitting required fields returns 400 naming each missing field', async () => {
    const { app } = freshApp();
    const res = await request(app).post('/api/time-entries').send({});
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: any) => d.field).sort();
    expect(fields).toEqual(['activityTypeId', 'date', 'description', 'endTime', 'startTime']);
  });

  it('POST with endTime equal to startTime returns 400 and inserts nothing (zero-length)', async () => {
    const { app } = freshApp();
    const typeId = await makeType(app);
    const res = await request(app)
      .post('/api/time-entries')
      .send({ ...base, activityTypeId: typeId, endTime: base.startTime });
    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d: any) => d.field === 'endTime')).toBe(true);

    const list = await request(app).get('/api/time-entries');
    expect(list.body.count).toBe(0);
  });

  it('POST with endTime earlier than startTime is accepted (midnight rollover), duration 45m', async () => {
    const { app } = freshApp();
    const typeId = await makeType(app);
    const res = await request(app)
      .post('/api/time-entries')
      .send({ ...base, activityTypeId: typeId, startTime: '23:30:00', endTime: '00:15:00' });
    expect(res.status).toBe(201);
    expect(res.body.durationMinutes).toBe(45);
  });

  it('POST with malformed date or time returns 400 naming the field', async () => {
    const { app } = freshApp();
    const typeId = await makeType(app);

    const badDate = await request(app)
      .post('/api/time-entries')
      .send({ ...base, activityTypeId: typeId, date: '15-01-2026' });
    expect(badDate.status).toBe(400);
    expect(badDate.body.error.details.some((d: any) => d.field === 'date')).toBe(true);

    const badTime = await request(app)
      .post('/api/time-entries')
      .send({ ...base, activityTypeId: typeId, startTime: '9am' });
    expect(badTime.status).toBe(400);
    expect(badTime.body.error.details.some((d: any) => d.field === 'startTime')).toBe(true);
  });

  it('POST with a non-existent activityTypeId returns 400 and inserts nothing', async () => {
    const { app } = freshApp();
    const res = await request(app).post('/api/time-entries').send({ ...base, activityTypeId: 999 });
    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d: any) => d.field === 'activityTypeId')).toBe(true);

    const list = await request(app).get('/api/time-entries');
    expect(list.body.count).toBe(0);
  });

  it('POST with description over 500 chars returns 400; exactly 500 is accepted', async () => {
    const { app } = freshApp();
    const typeId = await makeType(app);

    const tooLong = await request(app)
      .post('/api/time-entries')
      .send({ ...base, activityTypeId: typeId, description: 'x'.repeat(501) });
    expect(tooLong.status).toBe(400);

    const exact = await request(app)
      .post('/api/time-entries')
      .send({ ...base, activityTypeId: typeId, description: 'x'.repeat(500) });
    expect(exact.status).toBe(201);
  });

  it('POST with missing/empty description returns 400 (description is required)', async () => {
    const { app } = freshApp();
    const typeId = await makeType(app);
    for (const description of [undefined, '', '   ']) {
      const res = await request(app)
        .post('/api/time-entries')
        .send({ ...base, activityTypeId: typeId, description });
      expect(res.status).toBe(400);
      expect(res.body.error.details.some((d: any) => d.field === 'description')).toBe(true);
    }
  });

  it('GET on an empty database returns 200 with empty items, not 404', async () => {
    const { app } = freshApp();
    const res = await request(app).get('/api/time-entries');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], count: 0 });
  });

  it('GET sorts by date desc then startTime desc', async () => {
    const { app } = freshApp();
    const typeId = await makeType(app);
    await request(app).post('/api/time-entries').send({ ...base, activityTypeId: typeId, date: '2026-01-14' });
    await request(app)
      .post('/api/time-entries')
      .send({ ...base, activityTypeId: typeId, date: '2026-01-15', startTime: '08:00:00', endTime: '09:00:00' });
    await request(app)
      .post('/api/time-entries')
      .send({ ...base, activityTypeId: typeId, date: '2026-01-15', startTime: '10:00:00', endTime: '11:00:00' });

    const res = await request(app).get('/api/time-entries');
    const dates = res.body.items.map((i: any) => `${i.date} ${i.startTime}`);
    expect(dates).toEqual(['2026-01-15 10:00:00', '2026-01-15 08:00:00', '2026-01-14 09:00:00']);
  });

  it('GET filters by from/to inclusive range', async () => {
    const { app } = freshApp();
    const typeId = await makeType(app);
    await request(app).post('/api/time-entries').send({ ...base, activityTypeId: typeId, date: '2026-01-14' });
    await request(app).post('/api/time-entries').send({ ...base, activityTypeId: typeId, date: '2026-01-15' });
    await request(app).post('/api/time-entries').send({ ...base, activityTypeId: typeId, date: '2026-01-16' });

    const res = await request(app).get('/api/time-entries?from=2026-01-15&to=2026-01-16');
    expect(res.body.count).toBe(2);
    expect(res.body.items.map((i: any) => i.date).sort()).toEqual(['2026-01-15', '2026-01-16']);
  });

  it('GET filters by activityTypeId', async () => {
    const { app } = freshApp();
    const typeA = await makeType(app, 'Development');
    const typeB = await makeType(app, 'Meetings');
    await request(app).post('/api/time-entries').send({ ...base, activityTypeId: typeA });
    await request(app).post('/api/time-entries').send({ ...base, activityTypeId: typeB });

    const res = await request(app).get(`/api/time-entries?activityTypeId=${typeA}`);
    expect(res.body.count).toBe(1);
    expect(res.body.items[0].activityType.id).toBe(typeA);
  });

  it('from/to/activityTypeId combine with AND', async () => {
    const { app } = freshApp();
    const typeA = await makeType(app, 'Development');
    const typeB = await makeType(app, 'Meetings');
    await request(app)
      .post('/api/time-entries')
      .send({ ...base, activityTypeId: typeA, date: '2026-01-15' });
    await request(app)
      .post('/api/time-entries')
      .send({ ...base, activityTypeId: typeB, date: '2026-01-15' });
    await request(app)
      .post('/api/time-entries')
      .send({ ...base, activityTypeId: typeA, date: '2026-01-20' });

    const res = await request(app).get(
      `/api/time-entries?from=2026-01-15&to=2026-01-16&activityTypeId=${typeA}`,
    );
    expect(res.body.count).toBe(1);
  });

  it('malformed from/to returns 400 naming the field; from later than to returns 400', async () => {
    const { app } = freshApp();
    expect((await request(app).get('/api/time-entries?from=nope')).status).toBe(400);
    expect((await request(app).get('/api/time-entries?from=2026-01-16&to=2026-01-15')).status).toBe(400);
  });

  it('GET/PUT/DELETE by id on an unknown id returns 404', async () => {
    const { app } = freshApp();
    expect((await request(app).get('/api/time-entries/999')).status).toBe(404);
    expect((await request(app).put('/api/time-entries/999').send({ ...base, activityTypeId: 1 })).status).toBe(
      404,
    );
    expect((await request(app).delete('/api/time-entries/999')).status).toBe(404);
  });

  it('PUT updates persisted values, including recomputed durationMinutes', async () => {
    const { app } = freshApp();
    const typeId = await makeType(app);
    const created = await request(app).post('/api/time-entries').send({ ...base, activityTypeId: typeId });

    const res = await request(app)
      .put(`/api/time-entries/${created.body.id}`)
      .send({ ...base, activityTypeId: typeId, endTime: '12:00:00' });
    expect(res.status).toBe(200);
    expect(res.body.endTime).toBe('12:00:00');
    expect(res.body.durationMinutes).toBe(180);

    const get = await request(app).get(`/api/time-entries/${created.body.id}`);
    expect(get.body.endTime).toBe('12:00:00');
  });

  it('PUT applies the same validation as POST and leaves the stored row unchanged on failure', async () => {
    const { app } = freshApp();
    const typeId = await makeType(app);
    const created = await request(app).post('/api/time-entries').send({ ...base, activityTypeId: typeId });

    const res = await request(app)
      .put(`/api/time-entries/${created.body.id}`)
      .send({ ...base, activityTypeId: typeId, endTime: base.startTime });
    expect(res.status).toBe(400);

    const get = await request(app).get(`/api/time-entries/${created.body.id}`);
    expect(get.body).toEqual(created.body);
  });

  it('DELETE returns 204 with empty body and the row is gone', async () => {
    const { app } = freshApp();
    const typeId = await makeType(app);
    const created = await request(app).post('/api/time-entries').send({ ...base, activityTypeId: typeId });

    const res = await request(app).delete(`/api/time-entries/${created.body.id}`);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});

    expect((await request(app).get(`/api/time-entries/${created.body.id}`)).status).toBe(404);
  });
});
