import { describe, test, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import {
  createTestingApp,
  cleanDatabase,
  createTestDb,
  type TestApp,
  TEST_USER_IDS,
} from '../../setup';
import { createEventFixture } from '../../../fixtures';
import {
  CREATE_EVENT_USE_CASE,
  CREATE_PUBLISH_EVENT_FOR_ORGANIZER,
  UPDATE_EVENT_STATUS_USE_CASE,
} from '../../../../packages/backend/src/application/application.module';

const EVENT_ID = '2f180791-a8f5-4cf8-b703-0f220a44f7c8';
const EVENT_SLUG = 'events-auth-slug';
const ORGANIZER_A = TEST_USER_IDS.organizer1;
const ORGANIZER_B = TEST_USER_IDS.organizer2;

describe.skipIf(!process.env.TEST_DATABASE_URL)('events auth integration', () => {
  let testApp: TestApp;
  const db = createTestDb();
  const mockCreateEvent = vi.fn().mockResolvedValue({ eventId: EVENT_ID, slug: 'test', status: 'draft' });
  const mockPublishFactory = vi.fn().mockReturnValue(vi.fn().mockResolvedValue({ eventId: EVENT_ID, status: 'published' }));
  const mockUpdateStatus = vi.fn().mockResolvedValue({ eventId: EVENT_ID, status: 'cancelled' });

  beforeAll(async () => {
    testApp = await createTestingApp([
      { token: CREATE_EVENT_USE_CASE, value: mockCreateEvent },
      { token: CREATE_PUBLISH_EVENT_FOR_ORGANIZER, value: mockPublishFactory },
      { token: UPDATE_EVENT_STATUS_USE_CASE, value: mockUpdateStatus },
    ]);
  });
  afterAll(async () => testApp.close());
  beforeEach(async () => {
    await cleanDatabase(db);
    mockCreateEvent.mockClear();
    mockPublishFactory.mockClear();
    mockUpdateStatus.mockClear();
  });

  const eventBody = {
    title: 'Festival de Verao 2027',
    description: 'Musica ao vivo',
    location: 'Sao Paulo',
    startsAt: '2027-01-10T18:00:00.000Z',
    endsAt: null,
    imageUrl: null,
  };

  // ── create ──────────────────────────────────────────────────────────────────

  test('create blocks customer role', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/events')
      .set('x-test-user-id', TEST_USER_IDS.customerA)
      .set('x-test-role', 'customer')
      .send(eventBody);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
    expect(mockCreateEvent).not.toHaveBeenCalled();
  });

  test('create blocks checker role', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/events')
      .set('x-test-user-id', TEST_USER_IDS.checker)
      .set('x-test-role', 'checker')
      .send(eventBody);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
    expect(mockCreateEvent).not.toHaveBeenCalled();
  });

  test('create allows organizer with session actor scope', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/events')
      .set('x-test-user-id', ORGANIZER_A)
      .set('x-test-role', 'organizer')
      .send(eventBody);
    expect(res.status).toBe(201);
    expect(mockCreateEvent).toHaveBeenCalledWith(expect.objectContaining({ actorId: ORGANIZER_A }));
  });

  test('create allows admin globally', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/events')
      .set('x-test-user-id', TEST_USER_IDS.admin)
      .set('x-test-role', 'admin')
      .send(eventBody);
    expect(res.status).toBe(201);
    expect(mockCreateEvent).toHaveBeenCalled();
  });

  // ── publish ──────────────────────────────────────────────────────────────────

  test('publish blocks customer role', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/events/publish')
      .set('x-test-user-id', TEST_USER_IDS.customerA)
      .set('x-test-role', 'customer')
      .send({ eventId: EVENT_ID });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
  });

  test('publish blocks checker role', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/events/publish')
      .set('x-test-user-id', TEST_USER_IDS.checker)
      .set('x-test-role', 'checker')
      .send({ eventId: EVENT_ID });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
  });

  test('publish allows organizer', async () => {
    const publishMock = vi.fn().mockResolvedValue({ eventId: EVENT_ID, status: 'published' });
    mockPublishFactory.mockReturnValueOnce(publishMock);
    const res = await request(testApp.app.getHttpServer())
      .post('/api/events/publish')
      .set('x-test-user-id', ORGANIZER_A)
      .set('x-test-role', 'organizer')
      .send({ eventId: EVENT_ID });
    expect(res.status).toBe(201);
    expect(publishMock).toHaveBeenCalledWith({ eventId: EVENT_ID });
  });

  test('publish allows admin globally', async () => {
    const publishMock = vi.fn().mockResolvedValue({ eventId: EVENT_ID, status: 'published' });
    mockPublishFactory.mockReturnValueOnce(publishMock);
    const res = await request(testApp.app.getHttpServer())
      .post('/api/events/publish')
      .set('x-test-user-id', TEST_USER_IDS.admin)
      .set('x-test-role', 'admin')
      .send({ eventId: EVENT_ID });
    expect(res.status).toBe(201);
    expect(publishMock).toHaveBeenCalled();
  });

  // ── update status (PATCH /:slug/status — OwnershipGuard active) ─────────────

  test('update blocks customer role', async () => {
    await createEventFixture(db, { id: EVENT_ID, slug: EVENT_SLUG, organizerId: ORGANIZER_A, status: 'draft' });
    const res = await request(testApp.app.getHttpServer())
      .patch(`/api/events/${EVENT_SLUG}/status`)
      .set('x-test-user-id', TEST_USER_IDS.customerA)
      .set('x-test-role', 'customer')
      .send({ targetStatus: 'cancelled' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  test('update blocks checker role', async () => {
    await createEventFixture(db, { id: EVENT_ID, slug: EVENT_SLUG, organizerId: ORGANIZER_A, status: 'draft' });
    const res = await request(testApp.app.getHttpServer())
      .patch(`/api/events/${EVENT_SLUG}/status`)
      .set('x-test-user-id', TEST_USER_IDS.checker)
      .set('x-test-role', 'checker')
      .send({ targetStatus: 'cancelled' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  test('update blocks organizer outside ownership scope', async () => {
    await createEventFixture(db, { id: EVENT_ID, slug: EVENT_SLUG, organizerId: ORGANIZER_A, status: 'draft' });
    const res = await request(testApp.app.getHttpServer())
      .patch(`/api/events/${EVENT_SLUG}/status`)
      .set('x-test-user-id', ORGANIZER_B)
      .set('x-test-role', 'organizer')
      .send({ targetStatus: 'cancelled' });
    expect(res.status).toBe(403);
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  test('update allows organizer within ownership scope', async () => {
    await createEventFixture(db, { id: EVENT_ID, slug: EVENT_SLUG, organizerId: ORGANIZER_A, status: 'draft' });
    const res = await request(testApp.app.getHttpServer())
      .patch(`/api/events/${EVENT_SLUG}/status`)
      .set('x-test-user-id', ORGANIZER_A)
      .set('x-test-role', 'organizer')
      .send({ targetStatus: 'cancelled' });
    expect(res.status).toBe(200);
    expect(mockUpdateStatus).toHaveBeenCalledWith({ eventId: EVENT_ID, targetStatus: 'cancelled' });
  });

  test('update allows admin globally', async () => {
    await createEventFixture(db, { id: EVENT_ID, slug: EVENT_SLUG, organizerId: ORGANIZER_A, status: 'draft' });
    const res = await request(testApp.app.getHttpServer())
      .patch(`/api/events/${EVENT_SLUG}/status`)
      .set('x-test-user-id', TEST_USER_IDS.admin)
      .set('x-test-role', 'admin')
      .send({ targetStatus: 'cancelled' });
    expect(res.status).toBe(200);
    expect(mockUpdateStatus).toHaveBeenCalledWith({ eventId: EVENT_ID, targetStatus: 'cancelled' });
  });
});
