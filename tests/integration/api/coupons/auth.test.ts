import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestingApp, cleanDatabase, createTestDb, type TestApp, TEST_USER_IDS } from '../../setup';
import { createCouponFixture, createEventFixture } from '../../../fixtures';
import { DrizzleCouponRepository } from '../../../../src/server/repositories/drizzle';

const EVENT_ID = '2f180791-a8f5-4cf8-b703-0f220a44f7c8';
const COUPON_ID = '4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e';
const ORGANIZER_A = TEST_USER_IDS.organizer1;
const ORGANIZER_B = TEST_USER_IDS.organizer2;

describe.skipIf(!process.env.TEST_DATABASE_URL)('coupon governance auth integration', () => {
  let testApp: TestApp;
  const db = createTestDb();

  beforeAll(async () => { testApp = await createTestingApp(); });
  afterAll(async () => testApp.close());
  beforeEach(async () => cleanDatabase(db));

  const couponBody = (eventId: string) => ({
    eventId,
    code: 'SAVE20',
    discountType: 'percentage',
    discountInCents: null,
    discountPercentage: 20,
    maxRedemptions: 100,
    validFrom: '2026-06-01T00:00:00.000Z',
    validUntil: '2026-06-30T23:59:59.000Z',
  });

  test('blocks organizer when creating coupon for another organizer event', async () => {
    const event = await createEventFixture(db, { id: EVENT_ID, organizerId: ORGANIZER_A, status: 'published' });
    const res = await request(testApp.app.getHttpServer())
      .post('/api/coupons')
      .set('x-test-user-id', ORGANIZER_B)
      .set('x-test-role', 'organizer')
      .send(couponBody(event.id));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
  });

  test('allows organizer to create coupon within ownership scope', async () => {
    const event = await createEventFixture(db, { organizerId: ORGANIZER_A, status: 'published' });
    const res = await request(testApp.app.getHttpServer())
      .post('/api/coupons')
      .set('x-test-user-id', ORGANIZER_A)
      .set('x-test-role', 'organizer')
      .send({ ...couponBody(event.id), code: ' save20 ' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ eventId: event.id, code: 'SAVE20', discountType: 'percentage' });
  });

  test('allows admin to create coupon globally and persists normalized code', async () => {
    const event = await createEventFixture(db, { status: 'published' });
    const res = await request(testApp.app.getHttpServer())
      .post('/api/coupons')
      .set('x-test-user-id', TEST_USER_IDS.admin)
      .set('x-test-role', 'admin')
      .send({ ...couponBody(event.id), code: ' save20 ' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ eventId: event.id, code: 'SAVE20', discountType: 'percentage', maxRedemptions: 100 });
    const persisted = await new DrizzleCouponRepository(db).findByCodeForEvent('SAVE20', event.id);
    expect(persisted).not.toBeNull();
  });

  test('blocks customer when creating coupon', async () => {
    const event = await createEventFixture(db, { organizerId: ORGANIZER_A, status: 'published' });
    const res = await request(testApp.app.getHttpServer())
      .post('/api/coupons')
      .set('x-test-user-id', '00000000-0000-0000-0000-000000000077')
      .set('x-test-role', 'customer')
      .send(couponBody(event.id));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
  });

  test('blocks checker when creating coupon', async () => {
    const event = await createEventFixture(db, { organizerId: ORGANIZER_A, status: 'published' });
    const res = await request(testApp.app.getHttpServer())
      .post('/api/coupons')
      .set('x-test-user-id', '00000000-0000-0000-0000-000000000077')
      .set('x-test-role', 'checker')
      .send(couponBody(event.id));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
  });

  test('blocks organizer when updating coupon from another organizer event', async () => {
    const event = await createEventFixture(db, { organizerId: ORGANIZER_A, status: 'published' });
    const coupon = await createCouponFixture(db, event.id, { id: COUPON_ID, code: 'SAVE10', validFrom: new Date('2026-06-01T00:00:00.000Z'), validUntil: new Date('2026-06-30T23:59:59.000Z') });
    const res = await request(testApp.app.getHttpServer())
      .put(`/api/coupons/${coupon.id}`)
      .set('x-test-user-id', ORGANIZER_B)
      .set('x-test-role', 'organizer')
      .send({ code: 'SAVE20', discountType: 'percentage', discountInCents: null, discountPercentage: 20, maxRedemptions: 100, validFrom: '2026-06-01T00:00:00.000Z', validUntil: '2026-06-30T23:59:59.000Z' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
  });

  test('allows organizer to update coupon within ownership scope', async () => {
    const event = await createEventFixture(db, { organizerId: ORGANIZER_A, status: 'published' });
    const coupon = await createCouponFixture(db, event.id, { id: COUPON_ID, code: 'SAVE10', validFrom: new Date('2026-06-01T00:00:00.000Z'), validUntil: new Date('2026-06-30T23:59:59.000Z') });
    const res = await request(testApp.app.getHttpServer())
      .put(`/api/coupons/${coupon.id}`)
      .set('x-test-user-id', ORGANIZER_A)
      .set('x-test-role', 'organizer')
      .send({ code: ' save20 ', discountType: 'percentage', discountInCents: null, discountPercentage: 20, maxRedemptions: 100, validFrom: '2026-06-01T00:00:00.000Z', validUntil: '2026-06-30T23:59:59.000Z' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ couponId: coupon.id, eventId: event.id, code: 'SAVE20' });
  });

  test('allows admin to update coupon globally', async () => {
    const event = await createEventFixture(db, { organizerId: ORGANIZER_A, status: 'published' });
    const coupon = await createCouponFixture(db, event.id, { id: COUPON_ID, code: 'SAVE10', validFrom: new Date('2026-06-01T00:00:00.000Z'), validUntil: new Date('2026-06-30T23:59:59.000Z') });
    const res = await request(testApp.app.getHttpServer())
      .put(`/api/coupons/${coupon.id}`)
      .set('x-test-user-id', TEST_USER_IDS.admin)
      .set('x-test-role', 'admin')
      .send({ code: ' save20 ', discountType: 'percentage', discountInCents: null, discountPercentage: 20, maxRedemptions: 100, validFrom: '2026-06-01T00:00:00.000Z', validUntil: '2026-06-30T23:59:59.000Z' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ couponId: coupon.id, eventId: event.id, code: 'SAVE20' });
  });

  test('blocks customer when updating coupon', async () => {
    const event = await createEventFixture(db, { organizerId: ORGANIZER_A, status: 'published' });
    const coupon = await createCouponFixture(db, event.id, { id: COUPON_ID, code: 'SAVE10', validFrom: new Date('2026-06-01T00:00:00.000Z'), validUntil: new Date('2026-06-30T23:59:59.000Z') });
    const res = await request(testApp.app.getHttpServer())
      .put(`/api/coupons/${coupon.id}`)
      .set('x-test-user-id', '00000000-0000-0000-0000-000000000077')
      .set('x-test-role', 'customer')
      .send({ code: 'SAVE20', discountType: 'percentage', discountInCents: null, discountPercentage: 20, maxRedemptions: 100, validFrom: '2026-06-01T00:00:00.000Z', validUntil: '2026-06-30T23:59:59.000Z' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
  });

  test('blocks checker when updating coupon', async () => {
    const event = await createEventFixture(db, { organizerId: ORGANIZER_A, status: 'published' });
    const coupon = await createCouponFixture(db, event.id, { id: COUPON_ID, code: 'SAVE10', validFrom: new Date('2026-06-01T00:00:00.000Z'), validUntil: new Date('2026-06-30T23:59:59.000Z') });
    const res = await request(testApp.app.getHttpServer())
      .put(`/api/coupons/${coupon.id}`)
      .set('x-test-user-id', '00000000-0000-0000-0000-000000000077')
      .set('x-test-role', 'checker')
      .send({ code: 'SAVE20', discountType: 'percentage', discountInCents: null, discountPercentage: 20, maxRedemptions: 100, validFrom: '2026-06-01T00:00:00.000Z', validUntil: '2026-06-30T23:59:59.000Z' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
  });

  test('rejects invalid coupon window with conflict reason', async () => {
    const event = await createEventFixture(db, { status: 'published' });
    const res = await request(testApp.app.getHttpServer())
      .post('/api/coupons')
      .set('x-test-user-id', TEST_USER_IDS.admin)
      .set('x-test-role', 'admin')
      .send({ ...couponBody(event.id), validFrom: '2026-06-30T23:59:59.000Z', validUntil: '2026-06-01T00:00:00.000Z' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'conflict', details: { reason: 'invalid_coupon_window' } });
  });
});
