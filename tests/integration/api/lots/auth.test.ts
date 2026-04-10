import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestingApp, cleanDatabase, createTestDb, type TestApp, TEST_USER_IDS } from '../../setup';
import { createEventFixture, createLotFixture } from '../../../fixtures';

const EVENT_ID = '2f180791-a8f5-4cf8-b703-0f220a44f7c8';
const ORGANIZER_A = TEST_USER_IDS.organizer1;
const ORGANIZER_B = TEST_USER_IDS.organizer2;

describe.skipIf(!process.env.TEST_DATABASE_URL)('lots auth integration', () => {
  let testApp: TestApp;
  const db = createTestDb();

  beforeAll(async () => { testApp = await createTestingApp(); });
  afterAll(async () => testApp.close());
  beforeEach(async () => cleanDatabase(db));

  const validCreateBody = (eventId: string) => ({
    eventId,
    title: 'Lote Basico',
    priceInCents: 5000,
    totalQuantity: 100,
    maxPerOrder: 5,
    saleStartsAt: '2027-01-01T00:00:00.000Z',
    saleEndsAt: '2027-05-01T00:00:00.000Z',
  });

  // ── create-lot ───────────────────────────────────────────────────────────────

  test('create-lot blocks customer role', async () => {
    const event = await createEventFixture(db, { id: EVENT_ID, organizerId: ORGANIZER_A, status: 'draft' });
    const res = await request(testApp.app.getHttpServer())
      .post('/api/lots')
      .set('x-test-user-id', TEST_USER_IDS.customerA)
      .set('x-test-role', 'customer')
      .send(validCreateBody(event.id));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
  });

  test('create-lot blocks checker role', async () => {
    const event = await createEventFixture(db, { id: EVENT_ID, organizerId: ORGANIZER_A, status: 'draft' });
    const res = await request(testApp.app.getHttpServer())
      .post('/api/lots')
      .set('x-test-user-id', TEST_USER_IDS.checker)
      .set('x-test-role', 'checker')
      .send(validCreateBody(event.id));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
  });

  test('create-lot blocks organizer outside ownership scope', async () => {
    const event = await createEventFixture(db, { id: EVENT_ID, organizerId: ORGANIZER_A, status: 'draft' });
    const res = await request(testApp.app.getHttpServer())
      .post('/api/lots')
      .set('x-test-user-id', ORGANIZER_B)
      .set('x-test-role', 'organizer')
      .send(validCreateBody(event.id));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
  });

  test('create-lot allows organizer within ownership scope', async () => {
    const event = await createEventFixture(db, { id: EVENT_ID, organizerId: ORGANIZER_A, status: 'draft' });
    const res = await request(testApp.app.getHttpServer())
      .post('/api/lots')
      .set('x-test-user-id', ORGANIZER_A)
      .set('x-test-role', 'organizer')
      .send(validCreateBody(event.id));
    expect(res.status).toBe(201);
  });

  test('create-lot allows admin globally', async () => {
    const event = await createEventFixture(db, { organizerId: ORGANIZER_A, status: 'draft' });
    const res = await request(testApp.app.getHttpServer())
      .post('/api/lots')
      .set('x-test-user-id', TEST_USER_IDS.admin)
      .set('x-test-role', 'admin')
      .send(validCreateBody(event.id));
    expect(res.status).toBe(201);
  });

  // ── update-lot ───────────────────────────────────────────────────────────────

  test('update-lot blocks customer role', async () => {
    const event = await createEventFixture(db, { id: EVENT_ID, organizerId: ORGANIZER_A, status: 'draft' });
    const lot = await createLotFixture(db, event.id);
    const res = await request(testApp.app.getHttpServer())
      .put(`/api/lots/${lot.id}`)
      .set('x-test-user-id', TEST_USER_IDS.customerA)
      .set('x-test-role', 'customer')
      .send({ title: 'Updated', priceInCents: 7000, totalQuantity: 120, maxPerOrder: 10, saleStartsAt: '2027-01-01T00:00:00.000Z', saleEndsAt: '2027-05-01T00:00:00.000Z', status: 'active' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
  });

  test('update-lot blocks checker role', async () => {
    const event = await createEventFixture(db, { id: EVENT_ID, organizerId: ORGANIZER_A, status: 'draft' });
    const lot = await createLotFixture(db, event.id);
    const res = await request(testApp.app.getHttpServer())
      .put(`/api/lots/${lot.id}`)
      .set('x-test-user-id', TEST_USER_IDS.checker)
      .set('x-test-role', 'checker')
      .send({ title: 'Updated', priceInCents: 7000, totalQuantity: 120, maxPerOrder: 10, saleStartsAt: '2027-01-01T00:00:00.000Z', saleEndsAt: '2027-05-01T00:00:00.000Z', status: 'active' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
  });

  test('update-lot blocks organizer outside ownership scope', async () => {
    const event = await createEventFixture(db, { id: EVENT_ID, organizerId: ORGANIZER_A, status: 'draft' });
    const lot = await createLotFixture(db, event.id);
    const res = await request(testApp.app.getHttpServer())
      .put(`/api/lots/${lot.id}`)
      .set('x-test-user-id', ORGANIZER_B)
      .set('x-test-role', 'organizer')
      .send({ title: 'Updated', priceInCents: 7000, totalQuantity: 120, maxPerOrder: 10, saleStartsAt: '2027-01-01T00:00:00.000Z', saleEndsAt: '2027-05-01T00:00:00.000Z', status: 'active' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
  });

  test('update-lot allows organizer within ownership scope', async () => {
    const event = await createEventFixture(db, { id: EVENT_ID, organizerId: ORGANIZER_A, status: 'draft' });
    const lot = await createLotFixture(db, event.id);
    const res = await request(testApp.app.getHttpServer())
      .put(`/api/lots/${lot.id}`)
      .set('x-test-user-id', ORGANIZER_A)
      .set('x-test-role', 'organizer')
      .send({ title: 'Updated', priceInCents: 7000, totalQuantity: 120, maxPerOrder: 10, saleStartsAt: '2027-01-01T00:00:00.000Z', saleEndsAt: '2027-05-01T00:00:00.000Z', status: 'active' });
    expect(res.status).toBe(200);
  });

  test('update-lot allows admin globally', async () => {
    const event = await createEventFixture(db, { organizerId: ORGANIZER_A, status: 'draft' });
    const lot = await createLotFixture(db, event.id);
    const res = await request(testApp.app.getHttpServer())
      .put(`/api/lots/${lot.id}`)
      .set('x-test-user-id', TEST_USER_IDS.admin)
      .set('x-test-role', 'admin')
      .send({ title: 'Updated', priceInCents: 7000, totalQuantity: 120, maxPerOrder: 10, saleStartsAt: '2027-01-01T00:00:00.000Z', saleEndsAt: '2027-05-01T00:00:00.000Z', status: 'active' });
    expect(res.status).toBe(200);
  });
});
