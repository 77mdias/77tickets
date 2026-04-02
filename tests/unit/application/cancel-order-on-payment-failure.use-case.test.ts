import { expect, test, vi } from "vitest";

type CancelOrderOnPaymentFailureUseCaseFactory = (dependencies: {
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
  lotRepository: {
    incrementAvailableQuantity: (lotId: string, quantity: number) => Promise<boolean>;
  };
}) => (input: { orderId: string }) => Promise<{ outcome: "cancelled" | "already_cancelled" }>;

async function loadFactory(): Promise<CancelOrderOnPaymentFailureUseCaseFactory> {
  const importedModule = await import(
    "../../../src/server/application/use-cases/cancel-order-on-payment-failure.use-case"
  );
  const factory = (importedModule as { createCancelOrderOnPaymentFailureUseCase?: unknown })
    .createCancelOrderOnPaymentFailureUseCase;

  if (typeof factory !== "function") {
    throw new Error(
      "PAY-003 RED: expected createCancelOrderOnPaymentFailureUseCase export",
    );
  }

  return factory as CancelOrderOnPaymentFailureUseCaseFactory;
}

test("PAY-003 RED: cancels pending order and restores lot quantity", async () => {
  const createUseCase = await loadFactory();

  const incrementAvailableQuantity = vi.fn(async () => true);
  const updateStatusIfCurrent = vi.fn(async () => true);

  const useCase = createUseCase({
    orderRepository: {
      findById: async () => ({
        order: {
          id: "ord_010",
          customerId: "cus_001",
          eventId: "evt_001",
          status: "pending",
          subtotalInCents: 20000,
          discountInCents: 0,
          totalInCents: 20000,
          createdAt: new Date("2026-04-01T12:00:00.000Z"),
        },
        items: [{ lotId: "lot_001", quantity: 2, unitPriceInCents: 10000 }],
      }),
      updateStatusIfCurrent,
    },
    lotRepository: { incrementAvailableQuantity },
  });

  const result = await useCase({ orderId: "ord_010" });

  expect(result).toMatchObject({ outcome: "cancelled" });
  expect(updateStatusIfCurrent).toHaveBeenCalledWith("ord_010", "pending", "cancelled");
  expect(incrementAvailableQuantity).toHaveBeenCalledWith("lot_001", 2);
});

test("PAY-003 RED: is idempotent for already cancelled orders", async () => {
  const createUseCase = await loadFactory();

  const incrementAvailableQuantity = vi.fn(async () => true);
  const updateStatusIfCurrent = vi.fn(async () => false);

  const useCase = createUseCase({
    orderRepository: {
      findById: async () => ({
        order: {
          id: "ord_011",
          customerId: "cus_001",
          eventId: "evt_001",
          status: "cancelled",
          subtotalInCents: 20000,
          discountInCents: 0,
          totalInCents: 20000,
          createdAt: new Date("2026-04-01T12:00:00.000Z"),
        },
        items: [{ lotId: "lot_001", quantity: 2, unitPriceInCents: 10000 }],
      }),
      updateStatusIfCurrent,
    },
    lotRepository: { incrementAvailableQuantity },
  });

  const result = await useCase({ orderId: "ord_011" });

  expect(result).toMatchObject({ outcome: "already_cancelled" });
  expect(incrementAvailableQuantity).not.toHaveBeenCalled();
  expect(updateStatusIfCurrent).not.toHaveBeenCalled();
});
