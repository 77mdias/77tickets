import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestingApp, cleanDatabase, createTestDb, type TestApp, TEST_USER_IDS } from '../../setup';
import { createCouponFixture, createEventFixture, createLotFixture } from '../../../fixtures';

const EVENT_ID = '2f180791-a8f5-4cf8-b703-0f220a44f7c8';
const CUSTOMER_ID = TEST_USER_IDS.customerA;

describe.skipIf(!process.env.TEST_DATABASE_URL)('create order endpoint integration', () => {
  let testApp: TestApp;
  const db = createTestDb();

  beforeAll(async () => { testApp = await createTestingApp(); });
  afterAll(async () => testApp.close());
  beforeEach(async () => cleanDatabase(db));

  test('returns 201 and stable payload for a valid checkout request', async () => {
    const event = await createEventFixture(db, { id: EVENT_ID, status: 'published' });
    const lot = await createLotFixture(db, event.id, { availableQuantity: 5, maxPerOrder: 5, priceInCents: 10000 });
    await createCouponFixture(db, event.id, { code: 'SAVE20', discountPercentage: 20, discountInCents: null, validFrom: new Date('2026-01-01T00:00:00.000Z'), validUntil: new Date('2026-12-31T23:59:59.000Z') });

    const res = await request(testApp.app.getHttpServer())
      .post('/api/orders')
      .set('x-test-user-id', CUSTOMER_ID)
      .set('x-test-role', 'customer')
      .send({ eventId: event.id, items: [{ lotId: lot.id, quantity: 2 }], couponCode: 'SAVE20' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      eventId: event.id,
      customerId: CUSTOMER_ID,
      status: 'pending',
      subtotalInCents: 20000,
      discountInCents: 4000,
      totalInCents: 16000,
      items: [{ lotId: lot.id, quantity: 2, unitPriceInCents: 10000 }],
    });
  });

  test('returns 409 conflict with structured reason when stock is insufficient', async () => {
    const event = await createEventFixture(db, { status: 'published' });
    const lot = await createLotFixture(db, event.id, { availableQuantity: 1 });

    const res = await request(testApp.app.getHttpServer())
      .post('/api/orders')
      .set('x-test-user-id', CUSTOMER_ID)
      .set('x-test-role', 'customer')
      .send({ eventId: event.id, items: [{ lotId: lot.id, quantity: 2 }] });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'conflict', message: 'Create order conflict', details: { reason: 'insufficient_stock' } });
  });

  test('returns 409 conflict with structured reason when coupon is invalid', async () => {
    const event = await createEventFixture(db, { status: 'published' });
    const lot = await createLotFixture(db, event.id, { availableQuantity: 3 });

    const res = await request(testApp.app.getHttpServer())
      .post('/api/orders')
      .set('x-test-user-id', CUSTOMER_ID)
      .set('x-test-role', 'customer')
      .send({ eventId: event.id, items: [{ lotId: lot.id, quantity: 1 }], couponCode: 'INVALID10' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'conflict', message: 'Create order conflict', details: { reason: 'invalid_coupon' } });
  });

  test('returns 400 validation error for invalid request payload', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/orders')
      .set('x-test-user-id', CUSTOMER_ID)
      .set('x-test-role', 'customer')
      .send({ eventId: 'invalid-uuid', items: [] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation');
    expect(res.body.error.message).toBe('Invalid request payload');
    expect(res.body.error.details).toMatchObject({ issues: expect.any(Array) });
  });
});
