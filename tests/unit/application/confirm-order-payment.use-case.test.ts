import { expect, test, vi } from "vitest";

type ConfirmOrderPaymentUseCaseFactory = (dependencies: {
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
    updateStatusIfCurrent: (
      orderId: string,
      currentStatus: "pending" | "paid" | "expired" | "cancelled",
      nextStatus: "pending" | "paid" | "expired" | "cancelled",
    ) => Promise<boolean>;
  };
  ticketRepository: {
    activateByOrderId: (orderId: string) => Promise<void>;
  };
  couponRepository: {
    incrementRedemptionCount: (couponId: string) => Promise<void>;
  };
}) => (input: { orderId: string }) => Promise<{ outcome: "confirmed" | "already_paid" }>;

async function loadFactory(): Promise<ConfirmOrderPaymentUseCaseFactory> {
  const importedModule = await import(
    "../../../src/server/application/use-cases/confirm-order-payment.use-case"
  );
  const factory = (importedModule as { createConfirmOrderPaymentUseCase?: unknown })
    .createConfirmOrderPaymentUseCase;

  if (typeof factory !== "function") {
    throw new Error("PAY-002 RED: expected createConfirmOrderPaymentUseCase export");
  }

  return factory as ConfirmOrderPaymentUseCaseFactory;
}

test("PAY-002 RED: confirms pending order, activates tickets and increments coupon once", async () => {
  const createUseCase = await loadFactory();

  const activateByOrderId = vi.fn(async () => undefined);
  const incrementRedemptionCount = vi.fn(async () => undefined);
  const updateStatusIfCurrent = vi.fn(async () => true);

  const useCase = createUseCase({
    orderRepository: {
      findById: async () => ({
        order: {
          id: "ord_001",
          customerId: "cus_001",
          eventId: "evt_001",
          status: "pending",
          subtotalInCents: 20000,
          discountInCents: 5000,
          totalInCents: 15000,
          createdAt: new Date("2026-04-01T12:00:00.000Z"),
          couponId: "cpn_001",
        },
        items: [{ lotId: "lot_001", quantity: 2, unitPriceInCents: 10000 }],
      }),
      updateStatusIfCurrent,
    },
    ticketRepository: { activateByOrderId },
    couponRepository: { incrementRedemptionCount },
  });

  const result = await useCase({ orderId: "ord_001" });

  expect(result).toMatchObject({ outcome: "confirmed" });
  expect(activateByOrderId).toHaveBeenCalledWith("ord_001");
  expect(incrementRedemptionCount).toHaveBeenCalledWith("cpn_001");
  expect(updateStatusIfCurrent).toHaveBeenCalledWith("ord_001", "pending", "paid");
});

test("PAY-002 RED: confirms pending order without coupon without touching coupon repository", async () => {
  const createUseCase = await loadFactory();

  const activateByOrderId = vi.fn(async () => undefined);
  const incrementRedemptionCount = vi.fn(async () => undefined);
  const updateStatusIfCurrent = vi.fn(async () => true);

  const useCase = createUseCase({
    orderRepository: {
      findById: async () => ({
        order: {
          id: "ord_003",
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
      updateStatusIfCurrent,
    },
    ticketRepository: { activateByOrderId },
    couponRepository: { incrementRedemptionCount },
  });

  const result = await useCase({ orderId: "ord_003" });

  expect(result).toMatchObject({ outcome: "confirmed" });
  expect(activateByOrderId).toHaveBeenCalledWith("ord_003");
  expect(incrementRedemptionCount).not.toHaveBeenCalled();
  expect(updateStatusIfCurrent).toHaveBeenCalledWith("ord_003", "pending", "paid");
});

test("PAY-002 RED: is idempotent for already paid orders", async () => {
  const createUseCase = await loadFactory();

  const activateByOrderId = vi.fn(async () => undefined);
  const incrementRedemptionCount = vi.fn(async () => undefined);

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
          couponId: "cpn_001",
        },
        items: [{ lotId: "lot_001", quantity: 2, unitPriceInCents: 10000 }],
      }),
      updateStatusIfCurrent: async () => false,
    },
    ticketRepository: { activateByOrderId },
    couponRepository: { incrementRedemptionCount },
  });

  const result = await useCase({ orderId: "ord_002" });

  expect(result).toMatchObject({ outcome: "already_paid" });
  expect(activateByOrderId).not.toHaveBeenCalled();
  expect(incrementRedemptionCount).not.toHaveBeenCalled();
});
