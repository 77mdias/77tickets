import { describe, expect, test, vi } from "vitest";

describe("EMAIL regression: confirmation email is blocked for non-paid orders", () => {
  test.each(["cancelled", "expired", "pending"] as const)(
    "does not send email for %s orders",
    async (status) => {
      const importedModule = await import(
        "../../src/server/application/use-cases/send-order-confirmation-email.use-case"
      );

      const createSendOrderConfirmationEmailUseCase = (importedModule as {
        createSendOrderConfirmationEmailUseCase?: unknown;
      }).createSendOrderConfirmationEmailUseCase;

      if (typeof createSendOrderConfirmationEmailUseCase !== "function") {
        throw new Error("EMAIL-011 RED: expected createSendOrderConfirmationEmailUseCase export");
      }

      const sendOrderConfirmation = vi.fn(async () => undefined);

      const useCase = createSendOrderConfirmationEmailUseCase({
        orderRepository: {
          findById: async () => ({
            order: {
              id: "ord_001",
              customerId: "cus_001",
              eventId: "evt_001",
              status,
              subtotalInCents: 10000,
              discountInCents: 0,
              totalInCents: 10000,
              createdAt: new Date("2026-04-02T12:00:00.000Z"),
              couponId: null,
            },
            items: [{ lotId: "lot_001", quantity: 1, unitPriceInCents: 10000 }],
          }),
        },
        ticketRepository: {
          listByOrderId: async () => [
            {
              id: "tkt_001",
              eventId: "evt_001",
              orderId: "ord_001",
              lotId: "lot_001",
              code: "TKT-001",
              status: "cancelled",
              checkedInAt: null,
            },
          ],
        },
        eventRepository: {
          findById: async () => ({
            id: "evt_001",
            organizerId: "org_001",
            slug: "show-001",
            title: "Show 001",
            description: null,
            location: "Sao Paulo",
            imageUrl: null,
            status: "published",
            startsAt: new Date("2026-04-03T12:00:00.000Z"),
            endsAt: null,
          }),
        },
        userRepository: {
          findById: async () => ({
            id: "cus_001",
            email: "customer@77ticket.test",
            name: "Customer One",
            role: "customer",
            createdAt: new Date("2026-04-01T12:00:00.000Z"),
          }),
        },
        emailProvider: {
          sendOrderConfirmation,
        },
        generateQrDataUrl: async () => "data:image/png;base64,irrelevant",
      });

      await useCase({ orderId: "ord_001" });

      expect(sendOrderConfirmation).not.toHaveBeenCalled();
    },
  );
});
