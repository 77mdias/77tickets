import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestingApp, cleanDatabase, createTestDb, type TestApp, TEST_USER_IDS } from '../setup';
import { createEventFixture, createLotFixture } from '../../fixtures';

describe.skipIf(!process.env.TEST_DATABASE_URL)('customer public flow integration', () => {
  let testApp: TestApp;
  const db = createTestDb();

  beforeAll(async () => { testApp = await createTestingApp(); });
  afterAll(async () => testApp.close());
  beforeEach(async () => cleanDatabase(db));

  test('login context -> list event -> detail -> checkout -> orders with ticket token', async () => {
    const event = await createEventFixture(db, {
      organizerId: TEST_USER_IDS.organizer1,
      slug: 'flow-event-007',
      status: 'published',
      startsAt: new Date('2099-10-10T18:00:00.000Z'),
      endsAt: new Date('2099-10-10T23:00:00.000Z'),
    });
    const lot = await createLotFixture(db, event.id, {
      title: 'Flow Lot',
      availableQuantity: 5,
      totalQuantity: 5,
      maxPerOrder: 2,
      saleStartsAt: new Date('2026-01-01T00:00:00.000Z'),
      saleEndsAt: new Date('2026-12-31T23:59:59.000Z'),
      status: 'active',
    });

    // Step 1: List events
    const listRes = await request(testApp.app.getHttpServer()).get('/api/events?page=1&limit=10');
    expect(listRes.status).toBe(200);
    expect(listRes.body.events.map((e: { slug: string }) => e.slug)).toContain('flow-event-007');

    // Step 2: Get event detail
    const detailRes = await request(testApp.app.getHttpServer()).get('/api/events/flow-event-007');
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.lots.map((l: { id: string }) => l.id)).toContain(lot.id);

    // Step 3: Create order
    const orderRes = await request(testApp.app.getHttpServer())
      .post('/api/orders')
      .set('x-test-user-id', TEST_USER_IDS.customerA)
      .set('x-test-role', 'customer')
      .send({ eventId: event.id, items: [{ lotId: lot.id, quantity: 1 }] });
    expect(orderRes.status).toBe(201);

    // Step 4: Get customer orders
    const mineRes = await request(testApp.app.getHttpServer())
      .get('/api/orders/mine')
      .set('x-test-user-id', TEST_USER_IDS.customerA)
      .set('x-test-role', 'customer');
    expect(mineRes.status).toBe(200);
    expect(mineRes.body.orders).toHaveLength(1);
    expect(mineRes.body.orders[0].tickets).toHaveLength(1);
  });
});
