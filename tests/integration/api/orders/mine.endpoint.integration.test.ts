import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestingApp, cleanDatabase, createTestDb, type TestApp, TEST_USER_IDS } from '../../setup';
import { createEventFixture, createLotFixture, createOrderFixture, createTicketFixture } from '../../../fixtures';

describe.skipIf(!process.env.TEST_DATABASE_URL)('orders mine endpoint integration', () => {
  let testApp: TestApp;
  const db = createTestDb();

  beforeAll(async () => { testApp = await createTestingApp(); });
  afterAll(async () => testApp.close());
  beforeEach(async () => cleanDatabase(db));

  test('GET /api/orders/mine returns only authenticated customer orders with ticket tokens', async () => {
    const event = await createEventFixture(db, { status: 'published' });
    const lot = await createLotFixture(db, event.id);

    const customerAOrder = await createOrderFixture(db, event.id, { customerId: TEST_USER_IDS.customerA, status: 'paid' });
    const customerBOrder = await createOrderFixture(db, event.id, { customerId: TEST_USER_IDS.customerB, status: 'paid' });

    await createTicketFixture(db, { eventId: event.id, orderId: customerAOrder.id, lotId: lot.id }, { code: 'MINE-TKT-A-001' });
    await createTicketFixture(db, { eventId: event.id, orderId: customerBOrder.id, lotId: lot.id }, { code: 'MINE-TKT-B-001' });

    const res = await request(testApp.app.getHttpServer())
      .get('/api/orders/mine')
      .set('x-test-user-id', TEST_USER_IDS.customerA)
      .set('x-test-role', 'customer');

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
    expect(res.body.orders[0].id).toBe(customerAOrder.id);
    expect(res.body.orders[0].tickets.map((t: { token: string }) => t.token)).toEqual(['MINE-TKT-A-001']);
  });

  test('GET /api/orders/mine blocks checker role', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/api/orders/mine')
      .set('x-test-user-id', TEST_USER_IDS.checker)
      .set('x-test-role', 'checker');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
  });
});
