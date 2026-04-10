import { describe, test, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestingApp, cleanDatabase, createTestDb, type TestApp, TEST_USER_IDS } from '../../setup';
import { createEventFixture } from '../../../fixtures';
import { LIST_EVENT_ORDERS_USE_CASE } from '../../../../packages/backend/src/application/application.module';

const EVENT_ID = '2f180791-a8f5-4cf8-b703-0f220a44f7c8';
const EVENT_SLUG = 'list-orders-auth-event';
const ORGANIZER_A = TEST_USER_IDS.organizer1;
const ORGANIZER_B = TEST_USER_IDS.organizer2;

describe.skipIf(!process.env.TEST_DATABASE_URL)('list-event-orders auth integration', () => {
  let testApp: TestApp;
  const db = createTestDb();
  const mockListEventOrders = vi.fn().mockResolvedValue([]);

  beforeAll(async () => {
    testApp = await createTestingApp([
      { token: LIST_EVENT_ORDERS_USE_CASE, value: mockListEventOrders },
    ]);
  });
  afterAll(async () => testApp.close());
  beforeEach(async () => {
    await cleanDatabase(db);
    mockListEventOrders.mockClear();
  });

  test('blocks customer role', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/events/${EVENT_SLUG}/orders`)
      .set('x-test-user-id', TEST_USER_IDS.customerA)
      .set('x-test-role', 'customer');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
    expect(mockListEventOrders).not.toHaveBeenCalled();
  });

  test('blocks checker role', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/events/${EVENT_SLUG}/orders`)
      .set('x-test-user-id', TEST_USER_IDS.checker)
      .set('x-test-role', 'checker');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
    expect(mockListEventOrders).not.toHaveBeenCalled();
  });

  test('blocks organizer outside ownership scope', async () => {
    await createEventFixture(db, { id: EVENT_ID, organizerId: ORGANIZER_A, slug: EVENT_SLUG, status: 'published', startsAt: new Date('2027-06-01T10:00:00.000Z'), endsAt: new Date('2027-06-01T20:00:00.000Z') });
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/events/${EVENT_SLUG}/orders`)
      .set('x-test-user-id', ORGANIZER_B)
      .set('x-test-role', 'organizer');
    expect(res.status).toBe(403);
    expect(mockListEventOrders).not.toHaveBeenCalled();
  });

  test('allows organizer within ownership scope', async () => {
    await createEventFixture(db, { id: EVENT_ID, organizerId: ORGANIZER_A, slug: EVENT_SLUG, status: 'published', startsAt: new Date('2027-06-01T10:00:00.000Z'), endsAt: new Date('2027-06-01T20:00:00.000Z') });
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/events/${EVENT_SLUG}/orders`)
      .set('x-test-user-id', ORGANIZER_A)
      .set('x-test-role', 'organizer');
    expect(res.status).toBe(200);
    expect(mockListEventOrders).toHaveBeenCalled();
  });

  test('allows admin globally', async () => {
    await createEventFixture(db, { id: EVENT_ID, organizerId: ORGANIZER_A, slug: EVENT_SLUG, status: 'published', startsAt: new Date('2027-06-01T10:00:00.000Z'), endsAt: new Date('2027-06-01T20:00:00.000Z') });
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/events/${EVENT_SLUG}/orders`)
      .set('x-test-user-id', TEST_USER_IDS.admin)
      .set('x-test-role', 'admin');
    expect(res.status).toBe(200);
    expect(mockListEventOrders).toHaveBeenCalled();
  });
});
