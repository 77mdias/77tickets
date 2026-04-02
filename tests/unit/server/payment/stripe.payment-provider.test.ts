import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCheckoutSession: vi.fn(),
  constructWebhookEvent: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class StripeMock {
    checkout = {
      sessions: {
        create: mocks.createCheckoutSession,
      },
    };

    webhooks = {
      constructEvent: mocks.constructWebhookEvent,
    };

    constructor() {}
  },
}));

describe("createStripePaymentProvider", () => {
  beforeEach(() => {
    mocks.createCheckoutSession.mockReset();
    mocks.constructWebhookEvent.mockReset();
  });

  test("creates checkout session with order metadata and payment_intent metadata", async () => {
    const { createStripePaymentProvider } = await import(
      "../../../../src/server/payment/stripe.payment-provider"
    );

    mocks.createCheckoutSession.mockResolvedValueOnce({
      url: "https://checkout.stripe.test/cs_test_001",
    });

    const provider = createStripePaymentProvider({
      secretKey: "sk_test_123",
      webhookSecret: "whsec_123",
      appBaseUrl: "https://ticketflow.test",
    });

    const result = await provider.createCheckoutSession({
      order: {
        id: "ord_001",
        customerId: "cus_001",
        eventId: "evt_001",
        status: "pending",
        totalInCents: 20000,
      },
      items: [{ lotId: "lot_001", quantity: 2, unitPriceInCents: 10000 }],
    });

    expect(result).toEqual({
      checkoutUrl: "https://checkout.stripe.test/cs_test_001",
    });

    expect(mocks.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        success_url: "https://ticketflow.test/checkout/success",
        cancel_url: "https://ticketflow.test/checkout/cancel",
        metadata: {
          orderId: "ord_001",
          customerId: "cus_001",
          eventId: "evt_001",
        },
        payment_intent_data: {
          metadata: {
            orderId: "ord_001",
            customerId: "cus_001",
            eventId: "evt_001",
          },
        },
      }),
    );
  });

  test("constructWebhookEvent delegates signature validation to Stripe", async () => {
    const { createStripePaymentProvider } = await import(
      "../../../../src/server/payment/stripe.payment-provider"
    );

    mocks.constructWebhookEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: { object: { metadata: { orderId: "ord_001" } } },
    });

    const provider = createStripePaymentProvider({
      secretKey: "sk_test_123",
      webhookSecret: "whsec_123",
      appBaseUrl: "https://ticketflow.test",
    });

    const event = provider.constructWebhookEvent("raw-payload", "signature");

    expect(mocks.constructWebhookEvent).toHaveBeenCalledWith(
      "raw-payload",
      "signature",
      "whsec_123",
    );
    expect(event.type).toBe("checkout.session.completed");
  });
});
