import { expect, test, vi } from "vitest";

type CreateStripeCheckoutSessionUseCaseFactory = (dependencies: {
  orderRepository: {
    findById: (orderId: string) => Promise<{
      order: {
        id: string;
        customerId: string;
        eventId: string;
        status: "pending" | "paid" | "expired" | "cancelled";
        subtotalInCents: number;
        discountInCents: number;
        totalInCents: number;
        createdAt: Date;
        couponId?: string | null;
      };
      items: Array<{
        lotId: string;
        quantity: number;
        unitPriceInCents: number;
      }>;
    } | null>;
  };
  paymentProvider: {
    createCheckoutSession: (input: {
      order: {
        id: string;
        customerId: string;
        eventId: string;
        status: "pending" | "paid" | "expired" | "cancelled";
        totalInCents: number;
      };
      items: Array<{
        lotId: string;
        quantity: number;
        unitPriceInCents: number;
      }>;
    }) => Promise<{ checkoutUrl: string }>;
  };
}) => (input: { orderId: string; customerId: string }) => Promise<{ checkoutUrl: string }>;

async function loadFactory(): Promise<CreateStripeCheckoutSessionUseCaseFactory> {
  const importedModule = await import(
    "../../../src/server/application/use-cases/create-stripe-checkout-session.use-case"
  );
  const factory = (importedModule as { createCreateStripeCheckoutSessionUseCase?: unknown })
    .createCreateStripeCheckoutSessionUseCase;

  if (typeof factory !== "function") {
    throw new Error(
      "PAY-001 RED: expected createCreateStripeCheckoutSessionUseCase export",
    );
  }

  return factory as CreateStripeCheckoutSessionUseCaseFactory;
}

test("PAY-001 RED: creates checkout session only for pending order owned by customer", async () => {
  const createUseCase = await loadFactory();

  const paymentProvider = {
    createCheckoutSession: vi.fn(async () => ({
      checkoutUrl: "https://checkout.stripe.test/session_123",
    })),
  };

  const useCase = createUseCase({
    orderRepository: {
      findById: async () => ({
        order: {
          id: "ord_001",
          customerId: "cus_001",
          eventId: "evt_001",
          status: "pending",
          subtotalInCents: 20000,
          discountInCents: 0,
          totalInCents: 20000,
          createdAt: new Date("2026-04-01T12:00:00.000Z"),
          couponId: null,
        },
        items: [{ lotId: "lot_001", quantity: 2, unitPriceInCents: 10000 }],
      }),
    },
    paymentProvider,
  });

  const result = await useCase({ orderId: "ord_001", customerId: "cus_001" });

  expect(result).toEqual({ checkoutUrl: "https://checkout.stripe.test/session_123" });
  expect(paymentProvider.createCheckoutSession).toHaveBeenCalledWith({
    order: {
      id: "ord_001",
      customerId: "cus_001",
      eventId: "evt_001",
      status: "pending",
      totalInCents: 20000,
    },
    items: [{ lotId: "lot_001", quantity: 2, unitPriceInCents: 10000 }],
  });
});

test("PAY-001 RED: rejects non-pending orders", async () => {
  const createUseCase = await loadFactory();

  const useCase = createUseCase({
    orderRepository: {
      findById: async () => ({
        order: {
          id: "ord_002",
          customerId: "cus_001",
          eventId: "evt_001",
          status: "paid",
          subtotalInCents: 20000,
          discountInCents: 0,
          totalInCents: 20000,
          createdAt: new Date("2026-04-01T12:00:00.000Z"),
          couponId: null,
        },
        items: [{ lotId: "lot_001", quantity: 2, unitPriceInCents: 10000 }],
      }),
    },
    paymentProvider: {
      createCheckoutSession: async () => ({ checkoutUrl: "https://checkout.invalid" }),
    },
  });

  await expect(useCase({ orderId: "ord_002", customerId: "cus_001" })).rejects.toMatchObject({
    code: "conflict",
    details: { reason: "order_not_pending" },
  });
});
