import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructWebhookEvent: vi.fn(),
  confirmOrderPayment: vi.fn(),
  cancelOrderOnPaymentFailure: vi.fn(),
}));

vi.mock("@/server/payment/stripe.payment-provider", () => ({
  createStripePaymentProvider: () => ({
    constructWebhookEvent: mocks.constructWebhookEvent,
    createCheckoutSession: vi.fn(),
  }),
}));

vi.mock("@/server/application/use-cases", () => ({
  createConfirmOrderPaymentUseCase: () => mocks.confirmOrderPayment,
  createCancelOrderOnPaymentFailureUseCase: () => mocks.cancelOrderOnPaymentFailure,
  createSendOrderConfirmationEmailUseCase: () => vi.fn(),
}));

vi.mock("@/server/email", () => ({
  createResendEmailProvider: () => ({
    sendOrderConfirmation: vi.fn(),
    sendEventReminder: vi.fn(),
  }),
}));

beforeEach(() => {
  mocks.constructWebhookEvent.mockReset();
  mocks.confirmOrderPayment.mockReset();
  mocks.cancelOrderOnPaymentFailure.mockReset();
});

async function loadRoute(): Promise<(request: Request) => Promise<Response>> {
  const importedModule = await import("../../../../src/app/api/webhooks/stripe/route");
  const handler = (importedModule as { POST?: unknown }).POST;

  if (typeof handler !== "function") {
    throw new Error("PAY-014 RED: expected POST export from webhook route");
  }

  return handler as (request: Request) => Promise<Response>;
}

test("PAY-014 RED: returns 400 for invalid Stripe signatures", async () => {
  const post = await loadRoute();
  mocks.constructWebhookEvent.mockImplementationOnce(() => {
    throw new Error("invalid signature");
  });

  const response = await post(
    new Request("https://example.test/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "invalid",
      },
      body: JSON.stringify({ type: "checkout.session.completed" }),
    }),
  );

  expect(response.status).toBe(400);
  expect(mocks.confirmOrderPayment).not.toHaveBeenCalled();
  expect(mocks.cancelOrderOnPaymentFailure).not.toHaveBeenCalled();
});

test("PAY-014 RED: dispatches checkout.session.completed to confirm use-case", async () => {
  const post = await loadRoute();
  mocks.constructWebhookEvent.mockReturnValueOnce({
    type: "checkout.session.completed",
    data: {
      object: {
        metadata: {
          orderId: "ord_100",
        },
      },
    },
  });
  mocks.confirmOrderPayment.mockResolvedValueOnce({ outcome: "confirmed" });

  const response = await post(
    new Request("https://example.test/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "valid",
      },
      body: JSON.stringify({ type: "checkout.session.completed" }),
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ received: true });
  expect(mocks.confirmOrderPayment).toHaveBeenCalledWith({ orderId: "ord_100" });
  expect(mocks.cancelOrderOnPaymentFailure).not.toHaveBeenCalled();
});

test("PAY-014 RED: dispatches payment_intent.payment_failed to cancel use-case", async () => {
  const post = await loadRoute();
  mocks.constructWebhookEvent.mockReturnValueOnce({
    type: "payment_intent.payment_failed",
    data: {
      object: {
        metadata: {
          orderId: "ord_101",
        },
      },
    },
  });
  mocks.cancelOrderOnPaymentFailure.mockResolvedValueOnce({ outcome: "cancelled" });

  const response = await post(
    new Request("https://example.test/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "valid",
      },
      body: JSON.stringify({ type: "payment_intent.payment_failed" }),
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ received: true });
  expect(mocks.cancelOrderOnPaymentFailure).toHaveBeenCalledWith({ orderId: "ord_101" });
  expect(mocks.confirmOrderPayment).not.toHaveBeenCalled();
});
