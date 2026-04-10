import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { createTestingApp, type TestApp, TEST_USER_IDS } from '../../setup';
import { VALIDATE_CHECKIN_USE_CASE } from '../../../../packages/backend/src/application/application.module';
import { EVENT_REPOSITORY } from '../../../../packages/backend/src/infrastructure/database/database.module';

const EVENT_ID = '2f180791-a8f5-4cf8-b703-0f220a44f7c8';
const TICKET_ID = '4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e';

describe.skipIf(!process.env.TEST_DATABASE_URL)('check-in auth integration', () => {
  let testApp: TestApp;
  const mockValidateCheckin = vi.fn().mockResolvedValue({ outcome: 'approved', ticketId: TICKET_ID, eventId: EVENT_ID, checkerId: 'test', validatedAt: '2026-03-29T12:00:00.000Z' });
  const mockEventRepo = {
    findById: vi.fn().mockResolvedValue({ id: EVENT_ID, organizerId: TEST_USER_IDS.organizer1 }),
    findBySlug: vi.fn().mockResolvedValue(null),
  };

  beforeAll(async () => {
    testApp = await createTestingApp([
      { token: VALIDATE_CHECKIN_USE_CASE, value: mockValidateCheckin },
      { token: EVENT_REPOSITORY, value: mockEventRepo },
    ]);
  });
  afterAll(async () => testApp.close());

  const checkinBody = { ticketId: TICKET_ID, eventId: EVENT_ID };

  test('blocks customer role', async () => {
    const res = await supertest(testApp.app.getHttpServer())
      .post('/api/checkin')
      .set('x-test-user-id', TEST_USER_IDS.customerA)
      .set('x-test-role', 'customer')
      .send(checkinBody);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('authorization');
    expect(mockValidateCheckin).not.toHaveBeenCalled();
  });

  test('allows checker globally', async () => {
    mockValidateCheckin.mockClear();
    const res = await supertest(testApp.app.getHttpServer())
      .post('/api/checkin')
      .set('x-test-user-id', TEST_USER_IDS.checker)
      .set('x-test-role', 'checker')
      .send(checkinBody);
    expect(res.status).toBe(200);
    expect(mockValidateCheckin).toHaveBeenCalledWith(expect.objectContaining({ ticketId: TICKET_ID, eventId: EVENT_ID, checkerId: TEST_USER_IDS.checker }));
  });

  test('allows organizer', async () => {
    mockValidateCheckin.mockClear();
    const res = await supertest(testApp.app.getHttpServer())
      .post('/api/checkin')
      .set('x-test-user-id', TEST_USER_IDS.organizer1)
      .set('x-test-role', 'organizer')
      .send(checkinBody);
    expect(res.status).toBe(200);
    expect(mockValidateCheckin).toHaveBeenCalledWith(expect.objectContaining({ checkerId: TEST_USER_IDS.organizer1 }));
  });

  test('allows admin globally', async () => {
    mockValidateCheckin.mockClear();
    const res = await supertest(testApp.app.getHttpServer())
      .post('/api/checkin')
      .set('x-test-user-id', TEST_USER_IDS.admin)
      .set('x-test-role', 'admin')
      .send(checkinBody);
    expect(res.status).toBe(200);
    expect(mockValidateCheckin).toHaveBeenCalledWith(expect.objectContaining({ checkerId: TEST_USER_IDS.admin }));
  });
});
