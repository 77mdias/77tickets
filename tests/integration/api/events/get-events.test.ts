import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestingApp, cleanDatabase, createTestDb, type TestApp } from '../../setup';
import { createEventFixture } from '../../../fixtures';

const decodeCursor = (cursor: string): { startsAt: string; id: string } =>
  JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));

const EVENT_IDS = {
  festivalRock: '00000000-0000-0000-0000-000000000101',
  festivalTech: '00000000-0000-0000-0000-000000000102',
  corrida: '00000000-0000-0000-0000-000000000103',
} as const;

describe.skipIf(!process.env.TEST_DATABASE_URL)('GET /api/events discovery upgrades', () => {
  let testApp: TestApp;
  const db = createTestDb();

  beforeAll(async () => { testApp = await createTestingApp(); });
  afterAll(async () => testApp.close());
  beforeEach(async () => cleanDatabase(db));

  const seedDiscoveryEvents = async () => {
    const festivalRock = await createEventFixture(db, {
      id: EVENT_IDS.festivalRock,
      slug: 'festival-rock',
      title: 'Festival Rock',
      location: 'Sao Paulo',
      category: 'concerts',
      status: 'published',
      startsAt: new Date('2099-05-01T18:00:00.000Z'),
      endsAt: new Date('2099-05-01T22:00:00.000Z'),
    });
    const festivalTech = await createEventFixture(db, {
      id: EVENT_IDS.festivalTech,
      slug: 'festival-tech',
      title: 'Festival Tech',
      location: 'Recife',
      category: 'shows',
      status: 'published',
      startsAt: new Date('2099-06-01T18:00:00.000Z'),
      endsAt: new Date('2099-06-01T22:00:00.000Z'),
    });
    const corrida = await createEventFixture(db, {
      id: EVENT_IDS.corrida,
      slug: 'corrida',
      title: 'Corrida de Rua',
      location: 'Fortaleza',
      category: 'sports',
      status: 'published',
      startsAt: new Date('2099-07-01T08:00:00.000Z'),
      endsAt: new Date('2099-07-01T10:00:00.000Z'),
    });
    return { festivalRock, festivalTech, corrida };
  };

  test('filters by q on the public discovery feed', async () => {
    await seedDiscoveryEvents();
    const res = await request(testApp.app.getHttpServer()).get('/api/events?q=festival');
    expect(res.status).toBe(200);
    expect(res.body.events.map((e: any) => e.slug)).toEqual(['festival-rock', 'festival-tech']);
  });

  test('filters by location on the public discovery feed', async () => {
    await seedDiscoveryEvents();
    const res = await request(testApp.app.getHttpServer()).get('/api/events?location=Recife');
    expect(res.status).toBe(200);
    expect(res.body.events.map((e: any) => e.slug)).toEqual(['festival-tech']);
  });

  test('filters by category on the public discovery feed', async () => {
    await seedDiscoveryEvents();
    const res = await request(testApp.app.getHttpServer()).get('/api/events?category=shows');
    expect(res.status).toBe(200);
    expect(res.body.events.map((e: any) => e.slug)).toEqual(['festival-tech']);
  });

  test('filters by date on the public discovery feed', async () => {
    await seedDiscoveryEvents();
    const res = await request(testApp.app.getHttpServer()).get('/api/events?date=2099-07-01');
    expect(res.status).toBe(200);
    expect(res.body.events.map((e: any) => e.slug)).toEqual(['corrida']);
  });

  test('combines q, category, and date filters in one request', async () => {
    await seedDiscoveryEvents();
    const res = await request(testApp.app.getHttpServer())
      .get('/api/events?q=festival&category=shows&date=2099-06-01');
    expect(res.status).toBe(200);
    expect(res.body.events.map((e: any) => e.slug)).toEqual(['festival-tech']);
  });

  test('returns a nextCursor on the first cursor page', async () => {
    const { festivalTech, corrida } = await seedDiscoveryEvents();
    const res = await request(testApp.app.getHttpServer()).get('/api/events?limit=2');
    expect(res.status).toBe(200);
    expect(res.body.events.map((e: any) => e.slug)).toEqual(['festival-rock', 'festival-tech']);
    expect(res.body.nextCursor).toEqual(expect.any(String));
    expect(decodeCursor(res.body.nextCursor)).toEqual({
      startsAt: festivalTech.startsAt.toISOString(),
      id: festivalTech.id,
    });
    expect(res.body.events.find((e: any) => e.slug === corrida.slug)).toBeUndefined();
  });

  test('returns null nextCursor on the last cursor page', async () => {
    const { corrida } = await seedDiscoveryEvents();
    const first = await request(testApp.app.getHttpServer()).get('/api/events?limit=2');
    expect(first.status).toBe(200);
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/events?limit=2&cursor=${first.body.nextCursor}`);
    expect(res.status).toBe(200);
    expect(res.body.events.map((e: any) => e.slug)).toEqual([corrida.slug]);
    expect(res.body.nextCursor).toBeNull();
  });

  test('rejects an invalid date query with a 400 validation error', async () => {
    const res = await request(testApp.app.getHttpServer()).get('/api/events?date=not-a-date');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation');
    expect(res.body.error.message).toBe('Invalid request payload');
    expect(res.body.error.details).toMatchObject({
      issues: expect.arrayContaining([expect.objectContaining({ path: 'date' })]),
    });
  });

  test('keeps legacy page and limit pagination functional', async () => {
    await seedDiscoveryEvents();
    const res = await request(testApp.app.getHttpServer()).get('/api/events?page=2&limit=1');
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(1);
    expect(res.body.events.map((e: any) => e.slug)).toEqual(['festival-tech']);
    expect(res.body.nextCursor).toEqual(expect.any(String));
  });
});
