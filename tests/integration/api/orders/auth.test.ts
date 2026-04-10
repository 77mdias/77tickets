import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestingApp, cleanDatabase, createTestDb, type TestApp, TEST_USER_IDS } from '../../setup';
import { createEventFixture, createLotFixture } from '../../../fixtures';

describe.skipIf(!process.env.TEST_DATABASE_URL)('create order auth integration', () => {
  let testApp: TestApp;
  const db = createTestDb();

  beforeAll(async () => { testApp = await createTestingApp(); });
  afterAll(async () => testApp.close());
  beforeEach(async () => cleanDatabase(db));

  test('blocks unauthenticated requests', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/orders')
      .send({ eventId: '2f180791-a8f5-4cf8-b703-0f220a44f7c8', items: [{ lotId: '2f180791-a8f5-4cf8-b703-0f220a44f7c9', quantity: 1 }] });
    expect(res.status).toBe(401);
  });

  test('blocks organizer role', async () => {
    const event = await createEventFixture(db, { status: 'published' });
    const lot = await createLotFixture(db, event.id, { availableQuantity: 5, maxPerOrder: 5 });
    const res = await request(testApp.app.getHttpServer())
      .post('/api/orders')
      .set('x-test-user-id', TEST_USER_IDS.organizerX)
      .set('x-test-role', 'organizer')
      .send({ eventId: event.id, items: [{ lotId: lot.id, quantity: 1 }] });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
  });

  test('blocks checker role', async () => {
    const event = await createEventFixture(db, { status: 'published' });
    const lot = await createLotFixture(db, event.id, { availableQuantity: 5, maxPerOrder: 5 });
    const res = await request(testApp.app.getHttpServer())
      .post('/api/orders')
      .set('x-test-user-id', TEST_USER_IDS.checker)
      .set('x-test-role', 'checker')
      .send({ eventId: event.id, items: [{ lotId: lot.id, quantity: 1 }] });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
  });

  test('allows customer to create order (customerId set from session)', async () => {
    const event = await createEventFixture(db, { status: 'published' });
    const lot = await createLotFixture(db, event.id, { availableQuantity: 5, maxPerOrder: 5, priceInCents: 10000 });
    const res = await request(testApp.app.getHttpServer())
      .post('/api/orders')
      .set('x-test-user-id', TEST_USER_IDS.customerA)
      .set('x-test-role', 'customer')
      .send({ eventId: event.id, items: [{ lotId: lot.id, quantity: 1 }] });
    expect(res.status).toBe(201);
    expect(res.body.customerId).toBe(TEST_USER_IDS.customerA);
  });

  test('admin bypasses role guard and creates order with admin ID as customerId', async () => {
    const event = await createEventFixture(db, { status: 'published' });
    const lot = await createLotFixture(db, event.id, { availableQuantity: 5, maxPerOrder: 5, priceInCents: 10000 });
    const res = await request(testApp.app.getHttpServer())
      .post('/api/orders')
      .set('x-test-user-id', TEST_USER_IDS.admin)
      .set('x-test-role', 'admin')
      .send({ eventId: event.id, items: [{ lotId: lot.id, quantity: 1 }] });
    expect(res.status).toBe(201);
    expect(res.body.customerId).toBe(TEST_USER_IDS.admin);
  });
});
