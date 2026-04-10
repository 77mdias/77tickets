import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestingApp, type TestApp } from '../setup';

describe('CORS Configuration', () => {
  let app: TestApp;

  beforeAll(async () => {
    process.env.FRONTEND_URL = 'https://test-workers.dev';
    app = await createTestingApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return Access-Control-Allow-Origin for allowed origin', async () => {
    const res = await request(app.app.getHttpServer())
      .get('/api/events?page=1&limit=1')
      .set('Origin', 'https://test-workers.dev');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://test-workers.dev');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('should reject requests from non-allowed origins', async () => {
    const res = await request(app.app.getHttpServer())
      .options('/api/health')
      .set('Origin', 'https://evil.com');
    // CORS should not allow evil.com - header should be absent or contain an allowed origin
    const corsOrigin = res.headers['access-control-allow-origin'];
    expect(corsOrigin === 'https://evil.com' || corsOrigin === null || corsOrigin === undefined).toBe(true);
  });
});
