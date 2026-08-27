import request from 'supertest';
import { freshApp } from '../helpers/testApp';

describe('Error handling', () => {
  it('unknown route returns 404 JSON, not an HTML error page', async () => {
    const { app } = freshApp();
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.type).toBe('application/json');
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('an unhandled failure returns 500 with the standard shape and no stack trace', async () => {
    const { app, db } = freshApp();
    db.close(); // force every subsequent query to throw a plain (non-HttpError) Error

    const res = await request(app).get('/api/activity-types');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error).not.toHaveProperty('stack');
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\(.*:\d+:\d+\)/); // no stack-trace-shaped text
  });
});
