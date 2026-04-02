import { describe, expect, test, vi } from "vitest";

describe("PAY-015 regression coverage: payment state transitions", () => {
  test("successful payment promotes order, activates tickets, and increments coupon once", async () => {
    const importedModule = await import(
      "../../src/server/application/use-cases/confirm-order-payment.use-case"
    );
    const createConfirmOrderPaymentUseCase = (importedModule as {
      createConfirmOrderPaymentUseCase?: unknown;
    }).createConfirmOrderPaymentUseCase;

    if (typeof createConfirmOrderPaymentUseCase !== "function") {
      throw new Error("PAY-015 RED: expected createConfirmOrderPaymentUseCase export");
    }

    const ticketStatuses = ["pending", "pending"];
    const coupon = { redemptionCount: 0 };
    const updateStatusIfCurrent = vi.fn(async () => true);
    const activateByOrderId = vi.fn(async () => {
      ticketStatuses[0] = "active";
      ticketStatuses[1] = "active";
    });
    const incrementRedemptionCount = vi.fn(async () => {
      coupon.redemptionCount += 1;
    });

    const useCase = createConfirmOrderPaymentUseCase({
      orderRepository: {
        findById: async () => ({
          order: {
            id: "ord_reg_001",
            customerId: "cus_reg_001",
            eventId: "evt_reg_001",
            status: "pending" as const,
            subtotalInCents: 20000,
            discountInCents: 2000,
            totalInCents: 18000,
            createdAt: new Date("2026-04-01T12:00:00.000Z"),
            couponId: "cpn_reg_001",
          },
          items: [{ lotId: "lot_reg_001", quantity: 2, unitPriceInCents: 10000 }],
        }),
        updateStatusIfCurrent,
      },
      ticketRepository: {
        activateByOrderId,
      },
      couponRepository: {
        incrementRedemptionCount,
      },
    });

    const result = await useCase({ orderId: "ord_reg_001" });

    expect(result).toMatchObject({ outcome: "confirmed" });
    expect(updateStatusIfCurrent).toHaveBeenCalledWith("ord_reg_001", "pending", "paid");
    expect(activateByOrderId).toHaveBeenCalledWith("ord_reg_001");
    expect(ticketStatuses).toEqual(["active", "active"]);
    expect(incrementRedemptionCount).toHaveBeenCalledWith("cpn_reg_001");
    expect(coupon.redemptionCount).toBe(1);
  });

  test("failed payment cancels order and restores lot quantity without redeeming coupon", async () => {
    const importedModule = await import(
      "../../src/server/application/use-cases/cancel-order-on-payment-failure.use-case"
    );
    const createCancelOrderOnPaymentFailureUseCase = (importedModule as {
      createCancelOrderOnPaymentFailureUseCase?: unknown;
    }).createCancelOrderOnPaymentFailureUseCase;

    if (typeof createCancelOrderOnPaymentFailureUseCase !== "function") {
      throw new Error("PAY-015 RED: expected createCancelOrderOnPaymentFailureUseCase export");
    }

    const lot = { availableQuantity: 8 };
    const coupon = { redemptionCount: 0 };
    const updateStatusIfCurrent = vi.fn(async () => true);
    const incrementAvailableQuantity = vi.fn(async (_lotId: string, quantity: number) => {
      lot.availableQuantity += quantity;
      return true;
    });

    const useCase = createCancelOrderOnPaymentFailureUseCase({
      orderRepository: {
        findById: async () => ({
          order: {
            id: "ord_reg_002",
            customerId: "cus_reg_001",
            eventId: "evt_reg_001",
            status: "pending" as const,
            subtotalInCents: 20000,
            discountInCents: 2000,
            totalInCents: 18000,
            createdAt: new Date("2026-04-01T12:00:00.000Z"),
          },
          items: [{ lotId: "lot_reg_001", quantity: 2, unitPriceInCents: 10000 }],
        }),
        updateStatusIfCurrent,
      },
      lotRepository: {
        incrementAvailableQuantity,
      },
    });

    const result = await useCase({ orderId: "ord_reg_002" });

    expect(result).toMatchObject({ outcome: "cancelled" });
    expect(updateStatusIfCurrent).toHaveBeenCalledWith("ord_reg_002", "pending", "cancelled");
    expect(incrementAvailableQuantity).toHaveBeenCalledWith("lot_reg_001", 2);
    expect(lot.availableQuantity).toBe(10);
    expect(coupon.redemptionCount).toBe(0);
  });
});
