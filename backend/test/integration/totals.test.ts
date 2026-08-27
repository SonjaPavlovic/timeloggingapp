import request from 'supertest';
import { freshApp } from '../helpers/testApp';

async function makeType(app: any, name = 'Development') {
  const res = await request(app).post('/api/activity-types').send({ name });
  return res.body.id as number;
}

async function makeEntry(app: any, overrides: Record<string, unknown>) {
  return request(app).post('/api/time-entries').send({
    description: 'work',
    date: '2026-01-15',
    startTime: '09:00:00',
    endTime: '10:00:00',
    ...overrides,
  });
}

describe('Totals API', () => {
  it('by-day: empty database returns 200 with empty items and 0 grand total', async () => {
    const { app } = freshApp();
    const res = await request(app).get('/api/totals/by-day');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], grandTotalMinutes: 0 });
  });

  it('by-day: sums durations per date and computes entryCount + grandTotalMinutes', async () => {
    const { app } = freshApp();
    const typeId = await makeType(app);
    // three entries on 2026-01-15: 60, 30, 15 minutes
    await makeEntry(app, { activityTypeId: typeId, date: '2026-01-15', startTime: '08:00:00', endTime: '09:00:00' });
    await makeEntry(app, { activityTypeId: typeId, date: '2026-01-15', startTime: '09:00:00', endTime: '09:30:00' });
    await makeEntry(app, { activityTypeId: typeId, date: '2026-01-15', startTime: '10:00:00', endTime: '10:15:00' });

    const res = await request(app).get('/api/totals/by-day');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([{ date: '2026-01-15', totalMinutes: 105, entryCount: 3 }]);
    expect(res.body.grandTotalMinutes).toBe(105);
  });

  it('by-day: dates with no entries are absent; sorted date desc', async () => {
    const { app } = freshApp();
    const typeId = await makeType(app);
    await makeEntry(app, { activityTypeId: typeId, date: '2026-01-14' });
    await makeEntry(app, { activityTypeId: typeId, date: '2026-01-16' });

    const res = await request(app).get('/api/totals/by-day');
    expect(res.body.items.map((i: any) => i.date)).toEqual(['2026-01-16', '2026-01-14']);
  });

  it('by-day: rollover entry attributed wholly to its date field', async () => {
    const { app } = freshApp();
    const typeId = await makeType(app);
    await makeEntry(app, {
      activityTypeId: typeId,
      date: '2026-01-15',
      startTime: '23:30:00',
      endTime: '00:15:00',
    });

    const res = await request(app).get('/api/totals/by-day');
    expect(res.body.items).toEqual([{ date: '2026-01-15', totalMinutes: 45, entryCount: 1 }]);
  });

  it('by-day: from/to restricts range and recomputes grand total', async () => {
    const { app } = freshApp();
    const typeId = await makeType(app);
    await makeEntry(app, { activityTypeId: typeId, date: '2026-01-14', startTime: '08:00:00', endTime: '09:00:00' });
    await makeEntry(app, { activityTypeId: typeId, date: '2026-01-15', startTime: '08:00:00', endTime: '09:00:00' });

    const res = await request(app).get('/api/totals/by-day?from=2026-01-15&to=2026-01-16');
    expect(res.body.items).toEqual([{ date: '2026-01-15', totalMinutes: 60, entryCount: 1 }]);
    expect(res.body.grandTotalMinutes).toBe(60);
  });

  it('by-activity: empty database returns 200 with empty items and 0 grand total', async () => {
    const { app } = freshApp();
    const res = await request(app).get('/api/totals/by-activity');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], grandTotalMinutes: 0 });
  });

  it('by-activity: sums per type, sorted by totalMinutes desc, absent types excluded', async () => {
    const { app } = freshApp();
    const dev = await makeType(app, 'Development');
    const meetings = await makeType(app, 'Meetings');
    await makeType(app, 'Unused'); // no entries -> should be absent

    await makeEntry(app, { activityTypeId: dev, startTime: '08:00:00', endTime: '09:00:00' }); // 60m
    await makeEntry(app, { activityTypeId: meetings, startTime: '08:00:00', endTime: '09:30:00' }); // 90m

    const res = await request(app).get('/api/totals/by-activity');
    expect(res.body.items).toEqual([
      { activityTypeId: meetings, activityTypeName: 'Meetings', totalMinutes: 90, entryCount: 1 },
      { activityTypeId: dev, activityTypeName: 'Development', totalMinutes: 60, entryCount: 1 },
    ]);
    expect(res.body.grandTotalMinutes).toBe(150);
  });

  it('by-day and by-activity grand totals agree for the same range', async () => {
    const { app } = freshApp();
    const dev = await makeType(app, 'Development');
    const meetings = await makeType(app, 'Meetings');
    await makeEntry(app, { activityTypeId: dev, date: '2026-01-15', startTime: '08:00:00', endTime: '09:00:00' });
    await makeEntry(app, { activityTypeId: meetings, date: '2026-01-16', startTime: '08:00:00', endTime: '10:00:00' });

    const byDay = await request(app).get('/api/totals/by-day?from=2026-01-15&to=2026-01-16');
    const byActivity = await request(app).get('/api/totals/by-activity?from=2026-01-15&to=2026-01-16');
    expect(byDay.body.grandTotalMinutes).toBe(byActivity.body.grandTotalMinutes);
  });

  it('malformed from/to on totals endpoints returns 400', async () => {
    const { app } = freshApp();
    expect((await request(app).get('/api/totals/by-day?from=nope')).status).toBe(400);
    expect((await request(app).get('/api/totals/by-activity?from=2026-01-16&to=2026-01-15')).status).toBe(400);
  });
});
