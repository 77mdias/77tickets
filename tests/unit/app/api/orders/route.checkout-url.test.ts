import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createStripeCheckoutSession: vi.fn(),
  baseHandleCreateOrder: vi.fn(),
}));

vi.mock("@/server/api/orders/create-order.handler", () => ({
  createCreateOrderHandler: () => mocks.baseHandleCreateOrder,
}));

vi.mock("@/server/api/orders/create-order.route-adapter", () => ({
  getDatabaseUrlOrThrow: () => "postgresql://stub",
  createCreateOrderRouteAdapter:
    (dependencies: { handleCreateOrder: (request: unknown) => Promise<{ status: number; body: unknown }> }) =>
    async (request: Request) => {
      void request;
      const response = await dependencies.handleCreateOrder({
        actor: { role: "customer", userId: "cus_route_001" },
        body: {
          eventId: "evt_route_001",
          customerId: "cus_route_001",
          items: [{ lotId: "lot_route_001", quantity: 1 }],
        },
      });

      return Response.json(response.body, { status: response.status });
    },
}));

vi.mock("@/server/api/middleware", () => ({
  createOrderRateLimiter: () => () => ({ allowed: true, limit: 10, remaining: 9, resetAtUnix: 0 }),
}));

vi.mock("@/server/infrastructure/auth", () => ({
  getSession: async () => ({ userId: "cus_route_001", role: "customer" }),
}));

vi.mock("@/server/application/use-cases", () => ({
  createCreateOrderUseCase: () => vi.fn(),
  createCreateStripeCheckoutSessionUseCase: () => mocks.createStripeCheckoutSession,
}));

vi.mock("@/server/infrastructure/db/client", () => ({
  createDb: () => ({}) as Record<string, never>,
}));

vi.mock("@/server/infrastructure/observability", () => ({
  createConsoleCheckoutObservability: () => ({
    trackCheckoutAttempt: async () => undefined,
  }),
}));

vi.mock("@/server/repositories/drizzle", () => ({
  DrizzleCouponRepository: class {},
  DrizzleLotRepository: class {},
  DrizzleOrderRepository: class {},
}));

vi.mock("@/server/payment/stripe.payment-provider", () => ({
  createStripePaymentProvider: () => ({
    createCheckoutSession: vi.fn(),
    constructWebhookEvent: vi.fn(),
  }),
}));

const buildSuccessPayload = () => ({
  status: 200 as const,
  body: {
    data: {
      orderId: "ord_route_001",
      eventId: "evt_route_001",
      customerId: "cus_route_001",
      status: "pending",
      subtotalInCents: 10000,
      discountInCents: 0,
      totalInCents: 10000,
      items: [{ lotId: "lot_route_001", quantity: 1, unitPriceInCents: 10000 }],
    },
  },
});

describe("POST /api/orders checkout redirect contract", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.baseHandleCreateOrder.mockReset();
    mocks.createStripeCheckoutSession.mockReset();
    mocks.baseHandleCreateOrder.mockResolvedValue(buildSuccessPayload());
    mocks.createStripeCheckoutSession.mockResolvedValue({
      checkoutUrl: "https://checkout.stripe.test/session_route_001",
    });
  });

  test("returns internal simulation URL when PAYMENT_MODE=demo", async () => {
    process.env.PAYMENT_MODE = "demo";
    const importedModule = await import("../../../../../src/app/api/orders/route");
    const post = (importedModule as { POST: (request: Request) => Promise<Response> }).POST;

    const response = await post(
      new Request("https://example.test/api/orders", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: {
        orderId: "ord_route_001",
        checkoutUrl: "/checkout/simulate?orderId=ord_route_001",
      },
    });
    expect(mocks.createStripeCheckoutSession).not.toHaveBeenCalled();
  });

  test("returns Stripe checkout URL when PAYMENT_MODE=stripe", async () => {
    process.env.PAYMENT_MODE = "stripe";
    const importedModule = await import("../../../../../src/app/api/orders/route");
    const post = (importedModule as { POST: (request: Request) => Promise<Response> }).POST;

    const response = await post(
      new Request("https://example.test/api/orders", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: {
        orderId: "ord_route_001",
        checkoutUrl: "https://checkout.stripe.test/session_route_001",
      },
    });
    expect(mocks.createStripeCheckoutSession).toHaveBeenCalledWith({
      orderId: "ord_route_001",
      customerId: "cus_route_001",
    });
  });
});
