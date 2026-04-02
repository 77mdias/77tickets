import { describe, expect, test, vi } from "vitest";

type CreateSendEventReminderEmailUseCase = (dependencies: {
  orderRepository: {
    listByEventId: (eventId: string) => Promise<Array<{
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
        lotTitle?: string;
      }>;
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
    sendEventReminder: (payload: {
      recipientEmail: string;
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
    }) => Promise<void>;
  };
}) => (input: { eventId: string }) => Promise<{ processed: number }>;

async function loadFactory(): Promise<CreateSendEventReminderEmailUseCase> {
  const importedModule = await import(
    "../../../src/server/application/use-cases/send-event-reminder-email.use-case"
  );

  const factory = (importedModule as {
    createSendEventReminderEmailUseCase?: unknown;
  }).createSendEventReminderEmailUseCase;

  if (typeof factory !== "function") {
    throw new Error("EMAIL-005 RED: expected createSendEventReminderEmailUseCase export");
  }

  return factory as CreateSendEventReminderEmailUseCase;
}

describe("createSendEventReminderEmailUseCase", () => {
  test("sends reminder only for paid orders and returns processed count", async () => {
    const createUseCase = await loadFactory();

    const sendEventReminder = vi.fn(async () => undefined);

    const useCase = createUseCase({
      orderRepository: {
        listByEventId: async () => [
          {
            order: {
              id: "ord_paid_001",
              customerId: "cus_001",
              eventId: "evt_001",
              status: "paid",
              subtotalInCents: 10000,
              discountInCents: 0,
              totalInCents: 10000,
              createdAt: new Date("2026-04-02T12:00:00.000Z"),
              couponId: null,
            },
            items: [{ lotId: "lot_001", quantity: 1, unitPriceInCents: 10000 }],
          },
          {
            order: {
              id: "ord_cancelled_001",
              customerId: "cus_002",
              eventId: "evt_001",
              status: "cancelled",
              subtotalInCents: 10000,
              discountInCents: 0,
              totalInCents: 10000,
              createdAt: new Date("2026-04-02T12:00:00.000Z"),
              couponId: null,
            },
            items: [{ lotId: "lot_001", quantity: 1, unitPriceInCents: 10000 }],
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
        findById: async (userId: string) => ({
          id: userId,
          email: `${userId}@77ticket.test`,
          name: "Test User",
          role: "customer",
          createdAt: new Date("2026-04-01T12:00:00.000Z"),
        }),
      },
      emailProvider: {
        sendEventReminder,
      },
    });

    const result = await useCase({ eventId: "evt_001" });

    expect(result).toEqual({ processed: 1 });
    expect(sendEventReminder).toHaveBeenCalledTimes(1);
    expect(sendEventReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        order: expect.objectContaining({ id: "ord_paid_001", status: "paid" }),
        recipientEmail: "cus_001@77ticket.test",
        event: expect.objectContaining({ id: "evt_001", title: "Show 001" }),
      }),
    );
  });

  test("returns zero when there are no paid orders", async () => {
    const createUseCase = await loadFactory();

    const sendEventReminder = vi.fn(async () => undefined);

    const useCase = createUseCase({
      orderRepository: {
        listByEventId: async () => [
          {
            order: {
              id: "ord_expired_001",
              customerId: "cus_001",
              eventId: "evt_001",
              status: "expired",
              subtotalInCents: 10000,
              discountInCents: 0,
              totalInCents: 10000,
              createdAt: new Date("2026-04-02T12:00:00.000Z"),
              couponId: null,
            },
            items: [{ lotId: "lot_001", quantity: 1, unitPriceInCents: 10000 }],
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
        findById: async () => null,
      },
      emailProvider: {
        sendEventReminder,
      },
    });

    const result = await useCase({ eventId: "evt_001" });

    expect(result).toEqual({ processed: 0 });
    expect(sendEventReminder).not.toHaveBeenCalled();
  });
});
