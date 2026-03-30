import { describe, expect, test } from "vitest";

import { createCreateOrderHandler } from "../../../src/server/api/create-order.handler";
import { createGetEventHandler } from "../../../src/server/api/events/get-event.handler";
import { createListEventsHandler } from "../../../src/server/api/events/list-events.handler";
import { createGetCustomerOrdersHandler } from "../../../src/server/api/orders/get-customer-orders.handler";
import {
  createCreateOrderUseCase,
  createGetCustomerOrdersUseCase,
  createGetEventDetailUseCase,
  createListPublishedEventsUseCase,
} from "../../../src/server/application/use-cases";
import {
  DrizzleCouponRepository,
  DrizzleEventRepository,
  DrizzleLotRepository,
  DrizzleOrderRepository,
  DrizzleTicketRepository,
} from "../../../src/server/repositories/drizzle";
import { createEventFixture, createLotFixture } from "../../fixtures";
import { cleanDatabase, createTestDb, TEST_USER_IDS } from "../setup";

describe.skipIf(!process.env.TEST_DATABASE_URL)("customer public flow integration", () => {
  const db = createTestDb();

  test("login context -> list event -> detail -> checkout -> orders with ticket token", async () => {
    await cleanDatabase(db);

    const eventRepository = new DrizzleEventRepository(db);
    const lotRepository = new DrizzleLotRepository(db);
    const orderRepository = new DrizzleOrderRepository(db);
    const ticketRepository = new DrizzleTicketRepository(db);
    const couponRepository = new DrizzleCouponRepository(db);

    const event = await createEventFixture(db, {
      organizerId: TEST_USER_IDS.organizer1,
      slug: "flow-event-007",
      status: "published",
      startsAt: new Date("2099-10-10T18:00:00.000Z"),
      endsAt: new Date("2099-10-10T23:00:00.000Z"),
    });
    const lot = await createLotFixture(db, event.id, {
      title: "Flow Lot",
      availableQuantity: 5,
      totalQuantity: 5,
      maxPerOrder: 2,
      saleStartsAt: new Date("2026-01-01T00:00:00.000Z"),
      saleEndsAt: new Date("2026-12-31T23:59:59.000Z"),
      status: "active",
    });

    const listEventsHandler = createListEventsHandler({
      listPublishedEvents: createListPublishedEventsUseCase({
        eventRepository,
      }),
    });
    const getEventHandler = createGetEventHandler({
      getEventDetail: createGetEventDetailUseCase({
        now: () => new Date("2026-05-10T12:00:00.000Z"),
        eventRepository,
        lotRepository,
      }),
    });
    const createOrderHandler = createCreateOrderHandler({
      createOrder: createCreateOrderUseCase({
        now: () => new Date("2026-05-10T12:00:00.000Z"),
        generateOrderId: () => "00000000-0000-0000-0000-000000000700",
        generateTicketCode: () => "FLOW-TKT-001",
        orderRepository,
        lotRepository,
        couponRepository,
      }),
    });
    const myOrdersHandler = createGetCustomerOrdersHandler({
      getCustomerOrders: createGetCustomerOrdersUseCase({
        orderRepository,
        ticketRepository,
      }),
    });

    const listResponse = await listEventsHandler({ query: { page: "1", limit: "10" } });
    expect(listResponse.status).toBe(200);
    if (listResponse.status !== 200) return;
    expect(listResponse.body.data.events.map((item) => item.slug)).toContain("flow-event-007");

    const detailResponse = await getEventHandler({ params: { slug: "flow-event-007" } });
    expect(detailResponse.status).toBe(200);
    if (detailResponse.status !== 200) return;
    expect(detailResponse.body.data.lots.map((item) => item.id)).toContain(lot.id);

    const checkoutResponse = await createOrderHandler({
      actor: {
        role: "customer",
        userId: TEST_USER_IDS.customerA,
      },
      body: {
        eventId: event.id,
        customerId: TEST_USER_IDS.customerA,
        items: [{ lotId: lot.id, quantity: 1 }],
      },
    });
    expect(checkoutResponse.status).toBe(200);

    const mineResponse = await myOrdersHandler({
      actor: {
        role: "customer",
        userId: TEST_USER_IDS.customerA,
      },
    });

    expect(mineResponse.status).toBe(200);
    if (mineResponse.status !== 200) return;
    expect(mineResponse.body.data.orders).toHaveLength(1);
    expect(mineResponse.body.data.orders[0].tickets.map((ticket) => ticket.token)).toEqual([
      "FLOW-TKT-001",
    ]);
  });
});
