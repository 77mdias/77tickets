import { expect, test, vi } from "vitest";

type EventStatus = "draft" | "published" | "cancelled";

type EventRecord = {
  id: string;
  organizerId: string;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  imageUrl: string | null;
  status: EventStatus;
  startsAt: Date;
  endsAt: Date | null;
};

type ListEventOrdersResult = {
  eventId: string;
  orders: Array<{
    orderId: string;
    customerId: string;
    status: "pending" | "paid" | "expired" | "cancelled";
    subtotalInCents: number;
    discountInCents: number;
    totalInCents: number;
    createdAt: Date;
    items: Array<{
      lotId: string;
      lotTitle: string;
      quantity: number;
      unitPriceInCents: number;
    }>;
  }>;
};

type ListEventOrdersUseCaseFactory = (dependencies: {
  eventRepository: {
    findById: (eventId: string) => Promise<EventRecord | null>;
  };
  orderRepository: {
    listByEventId: (eventId: string) => Promise<
      Array<{
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
          lotTitle: string;
          quantity: number;
          unitPriceInCents: number;
        }>;
      }>
    >;
  };
}) => (input: {
  eventId: string;
  actor: {
    userId: string;
    role: "organizer" | "admin";
  };
}) => Promise<ListEventOrdersResult>;

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const ORGANIZER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";
const OTHER_ORGANIZER_ID = "c12f34a1-c6d3-4fcb-aa6d-8fb7f8fc04d5";

async function loadListEventOrdersFactory(): Promise<ListEventOrdersUseCaseFactory> {
  const useCaseModule = await import(
    "../../../src/server/application/use-cases/list-event-orders.use-case"
  );

  const createListEventOrdersUseCase = (
    useCaseModule as { createListEventOrdersUseCase?: unknown }
  ).createListEventOrdersUseCase;

  if (typeof createListEventOrdersUseCase !== "function") {
    throw new Error(
      "ORD-008 RED: expected createListEventOrdersUseCase to be exported by list-event-orders.use-case.ts",
    );
  }

  return createListEventOrdersUseCase as ListEventOrdersUseCaseFactory;
}

const makeEvent = (organizerId = ORGANIZER_ID): EventRecord => ({
  id: EVENT_ID,
  organizerId,
  slug: "festival-de-verao-2027",
  title: "Festival de Verao 2027",
  description: null,
  location: null,
  imageUrl: null,
  status: "published",
  startsAt: new Date("2027-01-10T18:00:00.000Z"),
  endsAt: null,
});

test("ORD-008 RED: lists event orders for the owning organizer", async () => {
  const createListEventOrdersUseCase = await loadListEventOrdersFactory();
  const listByEventId = vi.fn(async () => [
    {
      order: {
        id: "order-001",
        customerId: "customer-001",
        eventId: EVENT_ID,
        status: "paid" as const,
        subtotalInCents: 30000,
        discountInCents: 5000,
        totalInCents: 25000,
        createdAt: new Date("2027-01-01T12:00:00.000Z"),
      },
      items: [
        {
          lotId: "lot-001",
          lotTitle: "VIP",
          quantity: 2,
          unitPriceInCents: 15000,
        },
      ],
    },
  ]);

  const listEventOrders = createListEventOrdersUseCase({
    eventRepository: {
      findById: vi.fn(async () => makeEvent()),
    },
    orderRepository: {
      listByEventId,
    },
  });

  const result = await listEventOrders({
    eventId: EVENT_ID,
    actor: {
      userId: ORGANIZER_ID,
      role: "organizer",
    },
  });

  expect(listByEventId).toHaveBeenCalledWith(EVENT_ID);
  expect(result).toEqual({
    eventId: EVENT_ID,
    orders: [
      {
        orderId: "order-001",
        customerId: "customer-001",
        status: "paid",
        subtotalInCents: 30000,
        discountInCents: 5000,
        totalInCents: 25000,
        createdAt: new Date("2027-01-01T12:00:00.000Z"),
        items: [
          {
            lotId: "lot-001",
            lotTitle: "VIP",
            quantity: 2,
            unitPriceInCents: 15000,
          },
        ],
      },
    ],
  });
});

test("ORD-008 RED: allows admins to list orders for any event", async () => {
  const createListEventOrdersUseCase = await loadListEventOrdersFactory();
  const listByEventId = vi.fn(async () => []);

  const listEventOrders = createListEventOrdersUseCase({
    eventRepository: {
      findById: vi.fn(async () => makeEvent(OTHER_ORGANIZER_ID)),
    },
    orderRepository: {
      listByEventId,
    },
  });

  await listEventOrders({
    eventId: EVENT_ID,
    actor: {
      userId: ORGANIZER_ID,
      role: "admin",
    },
  });

  expect(listByEventId).toHaveBeenCalledWith(EVENT_ID);
});

test("ORD-008 RED: blocks organizers from listing foreign event orders", async () => {
  const createListEventOrdersUseCase = await loadListEventOrdersFactory();
  const listByEventId = vi.fn(async () => []);

  const listEventOrders = createListEventOrdersUseCase({
    eventRepository: {
      findById: vi.fn(async () => makeEvent(OTHER_ORGANIZER_ID)),
    },
    orderRepository: {
      listByEventId,
    },
  });

  await expect(
    listEventOrders({
      eventId: EVENT_ID,
      actor: {
        userId: ORGANIZER_ID,
        role: "organizer",
      },
    }),
  ).rejects.toMatchObject({
    code: "authorization",
  });

  expect(listByEventId).not.toHaveBeenCalled();
});
