import { expect, test, vi } from "vitest";

test("confirm payment keeps order paid even when confirmation email dispatch fails", async () => {
  const { createConfirmOrderPaymentUseCase } = await import(
    "../../../../src/server/application/use-cases/confirm-order-payment.use-case"
  );

  let storedStatus: "pending" | "paid" | "expired" | "cancelled" = "pending";

  const activateByOrderId = vi.fn(async () => undefined);
  const incrementRedemptionCount = vi.fn(async () => undefined);
  const sendOrderConfirmationEmail = vi.fn(async () => {
    throw new Error("email_provider_failure");
  });

  const useCase = createConfirmOrderPaymentUseCase({
    orderRepository: {
      findById: async () => ({
        order: {
          id: "ord_001",
          customerId: "cus_001",
          eventId: "evt_001",
          status: storedStatus,
          subtotalInCents: 10000,
          discountInCents: 0,
          totalInCents: 10000,
          createdAt: new Date("2026-04-02T12:00:00.000Z"),
          couponId: null,
        },
        items: [{ lotId: "lot_001", quantity: 1, unitPriceInCents: 10000 }],
      }),
      updateStatusIfCurrent: async (_orderId, currentStatus, nextStatus) => {
        if (storedStatus !== currentStatus) {
          return false;
        }

        storedStatus = nextStatus;
        return true;
      },
    },
    ticketRepository: {
      activateByOrderId,
    },
    couponRepository: {
      incrementRedemptionCount,
    },
    sendOrderConfirmationEmail,
  });

  const result = await useCase({ orderId: "ord_001" });

  expect(result).toEqual({ outcome: "confirmed" });
  expect(storedStatus).toBe("paid");
  expect(activateByOrderId).toHaveBeenCalledWith("ord_001");
  expect(sendOrderConfirmationEmail).toHaveBeenCalledWith({ orderId: "ord_001" });
});

