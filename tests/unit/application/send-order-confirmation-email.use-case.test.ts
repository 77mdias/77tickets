import { describe, expect, test, vi } from "vitest";

interface OrderRecord {
  id: string;
  customerId: string;
  eventId: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  createdAt: Date;
  couponId?: string | null;
}

type CreateSendOrderConfirmationEmailUseCase = (dependencies: {
  orderRepository: {
    findById: (orderId: string) => Promise<{
      order: OrderRecord;
      items: Array<{
        lotId: string;
        quantity: number;
        unitPriceInCents: number;
      }>;
    } | null>;
  };
  ticketRepository: {
    listByOrderId: (orderId: string) => Promise<Array<{
      id: string;
      eventId: string;
      orderId: string;
      lotId: string;
      code: string;
      status: "pending" | "active" | "used" | "cancelled";
      checkedInAt: Date | null;
    }>>;
  };
  eventRepository: {
    findById: (eventId: string) => Promise<{
      id: string;
      organizerId: string;
      slug: string;
      title: string;
      description: string | null;
      location: string | null;
      imageUrl: string | null;
      status: "draft" | "published" | "cancelled";
      startsAt: Date;
      endsAt: Date | null;
    } | null>;
  };
  userRepository: {
    findById: (userId: string) => Promise<{
      id: string;
      email: string;
      name: string;
      role: "customer" | "organizer" | "admin" | "checker";
      createdAt: Date;
    } | null>;
  };
  emailProvider: {
    sendOrderConfirmation: (payload: {
      recipientEmail: string;
      order: OrderRecord;
      event: {
        id: string;
        organizerId: string;
        slug: string;
        title: string;
        description: string | null;
        location: string | null;
        imageUrl: string | null;
        status: "draft" | "published" | "cancelled";
        startsAt: Date;
        endsAt: Date | null;
      };
      tickets: Array<{
        id: string;
        eventId: string;
        orderId: string;
        lotId: string;
        code: string;
        status: "pending" | "active" | "used" | "cancelled";
        checkedInAt: Date | null;
        qrDataUrl: string;
      }>;
    }) => Promise<void>;
  };
  generateQrDataUrl?: (code: string) => Promise<string>;
}) => (input: { orderId: string }) => Promise<void>;

async function loadFactory(): Promise<CreateSendOrderConfirmationEmailUseCase> {
  const importedModule = await import(
    "../../../src/server/application/use-cases/send-order-confirmation-email.use-case"
  );

  const factory = (importedModule as {
    createSendOrderConfirmationEmailUseCase?: unknown;
  }).createSendOrderConfirmationEmailUseCase;

  if (typeof factory !== "function") {
    throw new Error("EMAIL-004 RED: expected createSendOrderConfirmationEmailUseCase export");
  }

  return factory as CreateSendOrderConfirmationEmailUseCase;
}

describe("createSendOrderConfirmationEmailUseCase", () => {
  test("sends confirmation with all order tickets and QR codes when order is paid", async () => {
    const createUseCase = await loadFactory();

    const sendOrderConfirmation = vi.fn(async () => undefined);
    const generateQrDataUrl = vi.fn(async (code: string) => `data:image/png;base64,QR-${code}`);

    const useCase = createUseCase({
      orderRepository: {
        findById: async () => ({
          order: {
            id: "ord_001",
            customerId: "cus_001",
            eventId: "evt_001",
            status: "paid",
            subtotalInCents: 20000,
            discountInCents: 1000,
            totalInCents: 19000,
            createdAt: new Date("2026-04-02T12:00:00.000Z"),
            couponId: null,
          },
          items: [{ lotId: "lot_001", quantity: 2, unitPriceInCents: 10000 }],
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
            status: "active",
            checkedInAt: null,
          },
          {
            id: "tkt_002",
            eventId: "evt_001",
            orderId: "ord_001",
            lotId: "lot_001",
            code: "TKT-002",
            status: "active",
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
      generateQrDataUrl,
    });

    await useCase({ orderId: "ord_001" });

    expect(sendOrderConfirmation).toHaveBeenCalledTimes(1);
    expect(generateQrDataUrl).toHaveBeenCalledTimes(2);
    expect(sendOrderConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        order: expect.objectContaining({ id: "ord_001", status: "paid" }),
        recipientEmail: "customer@77ticket.test",
        event: expect.objectContaining({ id: "evt_001", title: "Show 001" }),
        tickets: expect.arrayContaining([
          expect.objectContaining({ code: "TKT-001", qrDataUrl: "data:image/png;base64,QR-TKT-001" }),
          expect.objectContaining({ code: "TKT-002", qrDataUrl: "data:image/png;base64,QR-TKT-002" }),
        ]),
      }),
    );
  });

  test("does not send confirmation when order status is not paid", async () => {
    const createUseCase = await loadFactory();

    const sendOrderConfirmation = vi.fn(async () => undefined);

    const useCase = createUseCase({
      orderRepository: {
        findById: async () => ({
          order: {
            id: "ord_002",
            customerId: "cus_001",
            eventId: "evt_001",
            status: "cancelled",
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
            id: "tkt_003",
            eventId: "evt_001",
            orderId: "ord_002",
            lotId: "lot_001",
            code: "TKT-003",
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
      generateQrDataUrl: async () => "data:image/png;base64,ignored",
    });

    await useCase({ orderId: "ord_002" });

    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });
});
