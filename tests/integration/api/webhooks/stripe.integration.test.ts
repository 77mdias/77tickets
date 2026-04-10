import { describe, test, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestingApp, type TestApp } from '../../setup';
import { PAYMENT_PROVIDER } from '../../../../packages/backend/src/payment/payment.module';
import {
  CONFIRM_ORDER_PAYMENT_USE_CASE,
  CANCEL_ORDER_ON_PAYMENT_FAILURE_USE_CASE,
} from '../../../../packages/backend/src/application/application.module';

describe.skipIf(!process.env.TEST_DATABASE_URL)('Stripe webhook integration', () => {
  let testApp: TestApp;
  const mockConstructEvent = vi.fn();
  const mockConfirmPayment = vi.fn().mockResolvedValue({ outcome: 'confirmed' });
  const mockCancelPayment = vi.fn().mockResolvedValue({ outcome: 'cancelled' });

  beforeAll(async () => {
    testApp = await createTestingApp([
      { token: PAYMENT_PROVIDER, value: { constructEvent: mockConstructEvent, createCheckoutSession: vi.fn() } },
      { token: CONFIRM_ORDER_PAYMENT_USE_CASE, value: mockConfirmPayment },
      { token: CANCEL_ORDER_ON_PAYMENT_FAILURE_USE_CASE, value: mockCancelPayment },
    ]);
  });
  afterAll(async () => testApp.close());
  beforeEach(() => {
    mockConstructEvent.mockReset();
    mockConfirmPayment.mockReset();
    mockCancelPayment.mockReset();
  });

  test('returns 400 for invalid Stripe signatures', async () => {
    mockConstructEvent.mockImplementationOnce(() => { throw new Error('invalid signature'); });
    const res = await request(testApp.app.getHttpServer())
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'invalid')
      .set('content-type', 'application/json')
      .send('{"type":"checkout.session.completed"}');
    expect(res.status).toBe(400);
    expect(mockConfirmPayment).not.toHaveBeenCalled();
    expect(mockCancelPayment).not.toHaveBeenCalled();
  });

  test('dispatches checkout.session.completed to confirm use-case', async () => {
    const sessionId = 'cs_test_abc123';
    mockConstructEvent.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: { object: { id: sessionId } },
    });
    mockConfirmPayment.mockResolvedValueOnce({ outcome: 'confirmed' });

    const res = await request(testApp.app.getHttpServer())
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'valid')
      .set('content-type', 'application/json')
      .send(JSON.stringify({ type: 'checkout.session.completed' }));

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ received: true });
    expect(mockConfirmPayment).toHaveBeenCalledWith({ stripeSessionId: sessionId });
    expect(mockCancelPayment).not.toHaveBeenCalled();
  });

  test('dispatches payment_intent.payment_failed to cancel use-case', async () => {
    const intentId = 'pi_test_xyz456';
    mockConstructEvent.mockReturnValueOnce({
      type: 'payment_intent.payment_failed',
      data: { object: { id: intentId } },
    });
    mockCancelPayment.mockResolvedValueOnce({ outcome: 'cancelled' });

    const res = await request(testApp.app.getHttpServer())
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'valid')
      .set('content-type', 'application/json')
      .send(JSON.stringify({ type: 'payment_intent.payment_failed' }));

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ received: true });
    expect(mockCancelPayment).toHaveBeenCalledWith({ stripeSessionId: intentId });
    expect(mockConfirmPayment).not.toHaveBeenCalled();
  });
});
