import { expect, test, vi } from "vitest";

import type { EventRecord, LotRecord, OrderWithItemsAndLotRecord, TicketRecord } from "../../../src/server/repositories";

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const EVENT_SLUG = "festival-de-verao-2027";
const ORGANIZER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";
const OTHER_ORGANIZER_ID = "c12f34a1-c6d3-4fcb-aa6d-8fb7f8fc04d5";
const CUSTOMER_ID = "00000000-0000-0000-0000-000000000099";
const ADMIN_ID = "00000000-0000-0000-0000-000000000199";

type GetEventAnalyticsUseCaseFactory = typeof import("../../../src/server/application/use-cases/get-event-analytics.use-case").createGetEventAnalyticsUseCase;

async function loadGetEventAnalyticsFactory(): Promise<GetEventAnalyticsUseCaseFactory> {
  const useCaseModule = await import(
    "../../../src/server/application/use-cases/get-event-analytics.use-case"
  );

  const createGetEventAnalyticsUseCase = (
    useCaseModule as { createGetEventAnalyticsUseCase?: unknown }
  ).createGetEventAnalyticsUseCase;

  if (typeof createGetEventAnalyticsUseCase !== "function") {
    throw new Error(
      "ANA-001 RED: expected createGetEventAnalyticsUseCase to be exported by get-event-analytics.use-case.ts",
    );
  }

  return createGetEventAnalyticsUseCase as GetEventAnalyticsUseCaseFactory;
}

function makeEvent(organizerId = ORGANIZER_ID): EventRecord {
  return {
    id: EVENT_ID,
    organizerId,
    slug: EVENT_SLUG,
    title: "Festival de Verao 2027",
    description: null,
    location: null,
    imageUrl: null,
    status: "published",
    startsAt: new Date("2027-01-10T18:00:00.000Z"),
    endsAt: null,
  };
}

function makeLots(): LotRecord[] {
  return [
    {
      id: "lot-vip",
      eventId: EVENT_ID,
      title: "VIP",
      priceInCents: 15000,
      totalQuantity: 20,
      availableQuantity: 5,
      maxPerOrder: 4,
      saleStartsAt: new Date("2026-12-01T00:00:00.000Z"),
      saleEndsAt: new Date("2027-01-09T23:59:59.000Z"),
      status: "active",
    },
    {
      id: "lot-pista",
      eventId: EVENT_ID,
      title: "Pista",
      priceInCents: 8000,
      totalQuantity: 100,
      availableQuantity: 25,
      maxPerOrder: 6,
      saleStartsAt: new Date("2026-12-01T00:00:00.000Z"),
      saleEndsAt: new Date("2027-01-09T23:59:59.000Z"),
      status: "active",
    },
  ];
}

function makePaidOrders(): OrderWithItemsAndLotRecord[] {
  return [
    {
      order: {
        id: "order-paid-vip",
        customerId: "customer-a",
        eventId: EVENT_ID,
        couponId: "coupon-10",
        status: "paid",
        subtotalInCents: 30000,
        discountInCents: 3000,
        totalInCents: 27000,
        createdAt: new Date("2027-01-01T10:00:00.000Z"),
      },
      items: [
        {
          lotId: "lot-vip",
          lotTitle: "VIP",
          quantity: 2,
          unitPriceInCents: 15000,
        },
      ],
    },
    {
      order: {
        id: "order-paid-mixed",
        customerId: "customer-b",
        eventId: EVENT_ID,
        couponId: null,
        status: "paid",
        subtotalInCents: 23000,
        discountInCents: 0,
        totalInCents: 23000,
        createdAt: new Date("2027-01-02T10:00:00.000Z"),
      },
      items: [
        {
          lotId: "lot-vip",
          lotTitle: "VIP",
          quantity: 1,
          unitPriceInCents: 15000,
        },
        {
          lotId: "lot-pista",
          lotTitle: "Pista",
          quantity: 1,
          unitPriceInCents: 8000,
        },
      ],
    },
    {
      order: {
        id: "order-cancelled",
        customerId: "customer-c",
        eventId: EVENT_ID,
        couponId: "coupon-10",
        status: "cancelled",
        subtotalInCents: 8000,
        discountInCents: 500,
        totalInCents: 7500,
        createdAt: new Date("2027-01-03T10:00:00.000Z"),
      },
      items: [
        {
          lotId: "lot-pista",
          lotTitle: "Pista",
          quantity: 1,
          unitPriceInCents: 8000,
        },
      ],
    },
  ];
}

function makeTicketsByOrder(): Record<string, TicketRecord[]> {
  return {
    "order-paid-vip": [
      {
        id: "ticket-1",
        eventId: EVENT_ID,
        orderId: "order-paid-vip",
        lotId: "lot-vip",
        code: "VIP-001",
        status: "active",
        checkedInAt: null,
      },
      {
        id: "ticket-2",
        eventId: EVENT_ID,
        orderId: "order-paid-vip",
        lotId: "lot-vip",
        code: "VIP-002",
        status: "used",
        checkedInAt: new Date("2027-01-10T18:30:00.000Z"),
      },
    ],
    "order-paid-mixed": [
      {
        id: "ticket-3",
        eventId: EVENT_ID,
        orderId: "order-paid-mixed",
        lotId: "lot-vip",
        code: "VIP-003",
        status: "active",
        checkedInAt: null,
      },
      {
        id: "ticket-4",
        eventId: EVENT_ID,
        orderId: "order-paid-mixed",
        lotId: "lot-pista",
        code: "PISTA-001",
        status: "active",
        checkedInAt: null,
      },
    ],
  };
}

test("ANA-001 RED: rejects customers from event analytics", async () => {
  const createGetEventAnalyticsUseCase = await loadGetEventAnalyticsFactory();

  const findBySlug = vi.fn(async (value: string) => (value === EVENT_SLUG ? makeEvent() : null));
  const findById = vi.fn(async (value: string) => (value === EVENT_ID ? makeEvent() : null));
  const findByEventId = vi.fn(async () => makeLots());
  const listByEventId = vi.fn(async () => makePaidOrders());
  const listByOrderId = vi.fn(async () => makeTicketsByOrder()["order-paid-vip"] ?? []);

  const getEventAnalytics = createGetEventAnalyticsUseCase({
    eventRepository: { findBySlug, findById },
    lotRepository: { findByEventId },
    orderRepository: { listByEventId },
    ticketRepository: { listByOrderId },
  });

  await expect(
    getEventAnalytics({
      eventId: EVENT_SLUG,
      actor: {
        userId: CUSTOMER_ID,
        role: "customer",
      },
    }),
  ).rejects.toMatchObject({
    code: "authorization",
  });

  expect(findBySlug).not.toHaveBeenCalled();
  expect(findById).not.toHaveBeenCalled();
  expect(findByEventId).not.toHaveBeenCalled();
  expect(listByEventId).not.toHaveBeenCalled();
  expect(listByOrderId).not.toHaveBeenCalled();
});

test("ANA-001 RED: returns not-found when the event slug does not exist", async () => {
  const createGetEventAnalyticsUseCase = await loadGetEventAnalyticsFactory();

  const findBySlug = vi.fn(async () => null);
  const findById = vi.fn(async () => null);
  const findByEventId = vi.fn(async () => makeLots());
  const listByEventId = vi.fn(async () => makePaidOrders());
  const listByOrderId = vi.fn(async () => []);

  const getEventAnalytics = createGetEventAnalyticsUseCase({
    eventRepository: { findBySlug, findById },
    lotRepository: { findByEventId },
    orderRepository: { listByEventId },
    ticketRepository: { listByOrderId },
  });

  await expect(
    getEventAnalytics({
      eventId: EVENT_SLUG,
      actor: {
        userId: ADMIN_ID,
        role: "admin",
      },
    }),
  ).rejects.toMatchObject({
    code: "not-found",
  });

  expect(findBySlug).toHaveBeenCalledWith(EVENT_SLUG);
  expect(findById).not.toHaveBeenCalled();
  expect(findByEventId).not.toHaveBeenCalled();
  expect(listByEventId).not.toHaveBeenCalled();
});

test("ANA-001 RED: rejects organizers who do not own the event", async () => {
  const createGetEventAnalyticsUseCase = await loadGetEventAnalyticsFactory();

  const findBySlug = vi.fn(async () => makeEvent(OTHER_ORGANIZER_ID));
  const findById = vi.fn(async () => makeEvent(OTHER_ORGANIZER_ID));
  const findByEventId = vi.fn(async () => makeLots());
  const listByEventId = vi.fn(async () => makePaidOrders());
  const listByOrderId = vi.fn(async () => []);

  const getEventAnalytics = createGetEventAnalyticsUseCase({
    eventRepository: { findBySlug, findById },
    lotRepository: { findByEventId },
    orderRepository: { listByEventId },
    ticketRepository: { listByOrderId },
  });

  await expect(
    getEventAnalytics({
      eventId: EVENT_SLUG,
      actor: {
        userId: ORGANIZER_ID,
        role: "organizer",
      },
    }),
  ).rejects.toMatchObject({
    code: "authorization",
  });

  expect(findBySlug).toHaveBeenCalledWith(EVENT_SLUG);
  expect(findByEventId).not.toHaveBeenCalled();
  expect(listByEventId).not.toHaveBeenCalled();
  expect(listByOrderId).not.toHaveBeenCalled();
});

test("ANA-001 RED: allows admins and organizers to read analytics with totalRevenue, totalTickets, lotStats, and couponStats", async () => {
  const createGetEventAnalyticsUseCase = await loadGetEventAnalyticsFactory();

  const findBySlug = vi.fn(async (value: string) => (value === EVENT_SLUG ? makeEvent() : null));
  const findById = vi.fn(async (value: string) => (value === EVENT_ID ? makeEvent() : null));
  const findByEventId = vi.fn(async () => makeLots());
  const listByEventId = vi.fn(async () => makePaidOrders());
  const ticketsByOrder = makeTicketsByOrder();
  const listByOrderId = vi.fn(async (orderId: string) => ticketsByOrder[orderId] ?? []);

  const getEventAnalytics = createGetEventAnalyticsUseCase({
    eventRepository: { findBySlug, findById },
    lotRepository: { findByEventId },
    orderRepository: { listByEventId },
    ticketRepository: { listByOrderId },
  });

  const organizerResult = await getEventAnalytics({
    eventId: EVENT_SLUG,
    actor: {
      userId: ORGANIZER_ID,
      role: "organizer",
    },
  });

  const adminResult = await getEventAnalytics({
    eventId: EVENT_ID,
    actor: {
      userId: ADMIN_ID,
      role: "admin",
    },
  });

  for (const result of [organizerResult, adminResult]) {
    expect(result).toEqual({
      eventId: EVENT_ID,
      totalRevenue: 50000,
      totalTickets: 4,
      lotStats: [
        {
          lotId: "lot-vip",
          title: "VIP",
          totalQuantity: 20,
          availableQuantity: 5,
          soldTickets: 3,
          revenue: 45000,
          occupancyPct: 15,
        },
        {
          lotId: "lot-pista",
          title: "Pista",
          totalQuantity: 100,
          availableQuantity: 25,
          soldTickets: 1,
          revenue: 8000,
          occupancyPct: 1,
        },
      ],
      couponStats: [
        {
          couponId: "coupon-10",
          uses: 1,
          totalDiscount: 3000,
          totalRevenue: 27000,
        },
      ],
    });
  }

  expect(findBySlug).toHaveBeenCalledWith(EVENT_SLUG);
  expect(findBySlug).toHaveBeenCalledWith(EVENT_ID);
  expect(findById).toHaveBeenCalledWith(EVENT_ID);
  expect(findByEventId).toHaveBeenCalledWith(EVENT_ID);
  expect(listByEventId).toHaveBeenCalledWith(EVENT_ID);
  expect(listByOrderId).toHaveBeenCalledTimes(4);
  expect(listByOrderId).toHaveBeenNthCalledWith(1, "order-paid-vip");
  expect(listByOrderId).toHaveBeenNthCalledWith(2, "order-paid-mixed");
});
