import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestingApp, cleanDatabase, createTestDb, type TestApp } from '../../setup';
import { createEventFixture, createLotFixture } from '../../../fixtures';

describe.skipIf(!process.env.TEST_DATABASE_URL)('public events endpoint integration', () => {
  let testApp: TestApp;
  const db = createTestDb();

  beforeAll(async () => { testApp = await createTestingApp(); });
  afterAll(async () => testApp.close());
  beforeEach(async () => cleanDatabase(db));

  test('GET /api/events returns only published upcoming events with pagination', async () => {
    await createEventFixture(db, { slug: 'pub-list-1', status: 'published', startsAt: new Date('2099-05-10T18:00:00.000Z'), endsAt: new Date('2099-05-10T22:00:00.000Z') });
    await createEventFixture(db, { slug: 'pub-list-2', status: 'published', startsAt: new Date('2099-06-10T18:00:00.000Z'), endsAt: new Date('2099-06-10T22:00:00.000Z') });
    await createEventFixture(db, { slug: 'draft-list-1', status: 'draft', startsAt: new Date('2099-07-10T18:00:00.000Z'), endsAt: new Date('2099-07-10T22:00:00.000Z') });

    const res = await request(testApp.app.getHttpServer()).get('/api/events?page=1&limit=1');
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(1);
    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0].slug).toBe('pub-list-1');
  });

  test('GET /api/events/:slug returns event detail with lot availability projection', async () => {
    const event = await createEventFixture(db, { slug: 'evento-detalhe', status: 'published', startsAt: new Date('2099-08-10T18:00:00.000Z'), endsAt: new Date('2099-08-10T22:00:00.000Z') });
    await createLotFixture(db, event.id, { title: 'Lote Ativo', status: 'active', availableQuantity: 12, saleStartsAt: new Date('2026-01-01T00:00:00.000Z'), saleEndsAt: new Date('2026-12-31T23:59:59.000Z') });
    await createLotFixture(db, event.id, { title: 'Lote Fora Janela', status: 'active', availableQuantity: 7, saleStartsAt: new Date('2025-01-01T00:00:00.000Z'), saleEndsAt: new Date('2025-12-31T23:59:59.000Z') });

    const res = await request(testApp.app.getHttpServer()).get('/api/events/evento-detalhe');
    expect(res.status).toBe(200);
    expect(res.body.event.slug).toBe('evento-detalhe');
    expect(res.body.lots.map((lot: any) => lot.available)).toEqual([12, 0]);
  });

  test('GET /api/events/:slug returns 404 for non-published slug', async () => {
    await createEventFixture(db, { slug: 'evento-draft', status: 'draft' });
    const res = await request(testApp.app.getHttpServer()).get('/api/events/evento-draft');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not-found');
  });
});
