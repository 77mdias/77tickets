import { describe, expect, test, vi } from "vitest";

import { createUnauthenticatedError } from "../../../../src/server/application/errors";
import type { SecurityActor } from "../../../../src/server/application/security";
import { createGetEventAnalyticsHandler } from "../../../../src/server/api/events/get-event-analytics.handler";
import { createGetEventAnalyticsRouteAdapter } from "../../../../src/server/api/events/get-event-analytics.route-adapter";
import { createGetEventAnalyticsUseCase } from "../../../../src/server/application/use-cases/get-event-analytics.use-case";
import {
  DrizzleEventRepository,
  DrizzleLotRepository,
  DrizzleOrderRepository,
  DrizzleTicketRepository,
} from "../../../../src/server/repositories/drizzle";
import {
  createCouponFixture,
  createEventFixture,
  createLotFixture,
  createOrderFixture,
  createOrderItemFixture,
  createTicketFixture,
} from "../../../fixtures";
import { cleanDatabase, createTestDb, TEST_USER_IDS } from "../../setup";

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const EVENT_SLUG = "event-analytics-2027";
const ORGANIZER_A = TEST_USER_IDS.organizer1;
const ORGANIZER_B = TEST_USER_IDS.organizer2;

const buildActor = (role: SecurityActor["role"], userId: string): SecurityActor => ({
  role,
  userId,
});

describe("GET /api/events/:slug/analytics route adapter", () => {
  test("returns 401 when session is missing before the handler runs", async () => {
    const handleGetEventAnalytics = vi.fn(async () => ({
      status: 200 as const,
      body: {
        data: {
          eventId: EVENT_ID,
          totalRevenue: 0,
          totalTickets: 0,
          lotStats: [],
          couponStats: [],
        },
      },
    }));

    const adapter = createGetEventAnalyticsRouteAdapter({
      getSession: async () => {
        throw createUnauthenticatedError("Sessão inválida ou expirada");
      },
      handleGetEventAnalytics,
    });

    const response = await adapter(
      new Request(`http://localhost/api/events/${EVENT_SLUG}/analytics`),
      { params: Promise.resolve({ slug: EVENT_SLUG }) },
    );

    expect(response.status).toBe(401);
    expect(handleGetEventAnalytics).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "unauthenticated" },
    });
  });
});

describe.skipIf(!process.env.TEST_DATABASE_URL)("GET /api/events/:slug/analytics integration", () => {
  const db = createTestDb();

  const createHandler = () =>
    createGetEventAnalyticsHandler({
      getEventAnalytics: createGetEventAnalyticsUseCase({
        eventRepository: new DrizzleEventRepository(db),
        lotRepository: new DrizzleLotRepository(db),
        orderRepository: new DrizzleOrderRepository(db),
        ticketRepository: new DrizzleTicketRepository(db),
      }),
    });

  test("blocks customer role", async () => {
    await cleanDatabase(db);

    const handler = createHandler();
    const response = await handler({
      actor: buildActor("customer", TEST_USER_IDS.customerA),
      params: { slug: EVENT_SLUG },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
  });

  test("blocks organizer outside ownership scope", async () => {
    await cleanDatabase(db);

    await createEventFixture(db, {
      id: EVENT_ID,
      organizerId: ORGANIZER_A,
      slug: EVENT_SLUG,
      title: "Event Analytics 2027",
      status: "draft",
      startsAt: new Date("2027-06-01T10:00:00.000Z"),
      endsAt: new Date("2027-06-01T20:00:00.000Z"),
    });

    const handler = createHandler();
    const response = await handler({
      actor: buildActor("organizer", ORGANIZER_B),
      params: { slug: EVENT_SLUG },
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
  });

  test("allows organizer owner and returns analytics payload", async () => {
    await cleanDatabase(db);

    const event = await createEventFixture(db, {
      id: EVENT_ID,
      organizerId: ORGANIZER_A,
      slug: EVENT_SLUG,
      title: "Event Analytics 2027",
      status: "draft",
      startsAt: new Date("2027-06-01T10:00:00.000Z"),
      endsAt: new Date("2027-06-01T20:00:00.000Z"),
    });

    const coupon = await createCouponFixture(db, event.id, {
      id: "de9d53e3-bc47-4548-bf90-2f2ff21c783a",
      code: "SAVE10",
      discountType: "percentage",
      discountPercentage: 10,
      discountInCents: null,
      maxRedemptions: 10,
      redemptionCount: 0,
      validFrom: new Date("2027-01-01T00:00:00.000Z"),
      validUntil: new Date("2027-12-31T23:59:59.000Z"),
    });

    const vipLot = await createLotFixture(db, event.id, {
      title: "VIP",
      totalQuantity: 20,
      availableQuantity: 17,
      priceInCents: 12000,
    });
    const generalLot = await createLotFixture(db, event.id, {
      title: "General",
      totalQuantity: 100,
      availableQuantity: 99,
      priceInCents: 6000,
    });

    const paidOrderWithCoupon = await createOrderFixture(db, event.id, {
      customerId: TEST_USER_IDS.customerA,
      couponId: coupon.id,
      status: "paid",
      subtotalInCents: 24000,
      discountInCents: 2400,
      totalInCents: 21600,
    });
    await createOrderItemFixture(db, paidOrderWithCoupon.id, vipLot.id, {
      quantity: 2,
      unitPriceInCents: 12000,
    });
    await createTicketFixture(
      db,
      { eventId: event.id, orderId: paidOrderWithCoupon.id, lotId: vipLot.id },
      { code: "VIP-001", status: "active" },
    );
    await createTicketFixture(
      db,
      { eventId: event.id, orderId: paidOrderWithCoupon.id, lotId: vipLot.id },
      { code: "VIP-002", status: "used", checkedInAt: new Date("2027-06-01T11:00:00.000Z") },
    );

    const paidOrderWithoutCoupon = await createOrderFixture(db, event.id, {
      customerId: TEST_USER_IDS.customerB,
      status: "paid",
      subtotalInCents: 18000,
      discountInCents: 0,
      totalInCents: 18000,
    });
    await createOrderItemFixture(db, paidOrderWithoutCoupon.id, vipLot.id, {
      quantity: 1,
      unitPriceInCents: 12000,
    });
    await createOrderItemFixture(db, paidOrderWithoutCoupon.id, generalLot.id, {
      quantity: 1,
      unitPriceInCents: 6000,
    });
    await createTicketFixture(
      db,
      { eventId: event.id, orderId: paidOrderWithoutCoupon.id, lotId: vipLot.id },
      { code: "VIP-003", status: "active" },
    );
    await createTicketFixture(
      db,
      { eventId: event.id, orderId: paidOrderWithoutCoupon.id, lotId: generalLot.id },
      { code: "GEN-001", status: "active" },
    );

    const cancelledOrder = await createOrderFixture(db, event.id, {
      customerId: TEST_USER_IDS.customerB,
      couponId: coupon.id,
      status: "cancelled",
      subtotalInCents: 6000,
      discountInCents: 600,
      totalInCents: 5400,
    });
    await createOrderItemFixture(db, cancelledOrder.id, generalLot.id, {
      quantity: 1,
      unitPriceInCents: 6000,
    });

    const handler = createHandler();
    const response = await handler({
      actor: buildActor("organizer", ORGANIZER_A),
      params: { slug: EVENT_SLUG },
    });

    expect(response.status).toBe(200);
    if (response.status !== 200) {
      return;
    }

    expect(response.body.data).toEqual({
      eventId: EVENT_ID,
      totalRevenue: 39600,
      totalTickets: 4,
      lotStats: [
        {
          lotId: vipLot.id,
          title: "VIP",
          totalQuantity: 20,
          availableQuantity: 17,
          soldTickets: 3,
          revenue: 36000,
          occupancyPct: 15,
        },
        {
          lotId: generalLot.id,
          title: "General",
          totalQuantity: 100,
          availableQuantity: 99,
          soldTickets: 1,
          revenue: 6000,
          occupancyPct: 1,
        },
      ],
      couponStats: [
        {
          couponId: coupon.id,
          uses: 1,
          totalDiscount: 2400,
          totalRevenue: 21600,
        },
      ],
    });
  });

  test("allows admin globally and returns analytics payload", async () => {
    await cleanDatabase(db);

    const event = await createEventFixture(db, {
      id: EVENT_ID,
      organizerId: ORGANIZER_A,
      slug: EVENT_SLUG,
      title: "Event Analytics 2027",
      status: "draft",
      startsAt: new Date("2027-06-01T10:00:00.000Z"),
      endsAt: new Date("2027-06-01T20:00:00.000Z"),
    });

    const lot = await createLotFixture(db, event.id, {
      title: "General",
      totalQuantity: 50,
      availableQuantity: 49,
      priceInCents: 6000,
    });
    const paidOrder = await createOrderFixture(db, event.id, {
      customerId: TEST_USER_IDS.customerA,
      status: "paid",
      subtotalInCents: 6000,
      discountInCents: 0,
      totalInCents: 6000,
    });
    await createOrderItemFixture(db, paidOrder.id, lot.id, {
      quantity: 1,
      unitPriceInCents: 6000,
    });
    await createTicketFixture(
      db,
      { eventId: event.id, orderId: paidOrder.id, lotId: lot.id },
      { status: "active" },
    );

    const handler = createHandler();
    const response = await handler({
      actor: buildActor("admin", TEST_USER_IDS.admin),
      params: { slug: EVENT_SLUG },
    });

    expect(response.status).toBe(200);
    if (response.status !== 200) {
      return;
    }

    expect(response.body.data).toEqual({
      eventId: EVENT_ID,
      totalRevenue: 6000,
      totalTickets: 1,
      lotStats: [
        {
          lotId: lot.id,
          title: "General",
          totalQuantity: 50,
          availableQuantity: 49,
          soldTickets: 1,
          revenue: 6000,
          occupancyPct: 2,
        },
      ],
      couponStats: [],
    });
  });

  test("returns 404 when the slug does not exist", async () => {
    await cleanDatabase(db);

    const handler = createHandler();
    const response = await handler({
      actor: buildActor("admin", TEST_USER_IDS.admin),
      params: { slug: "missing-analytics-slug" },
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("not-found");
  });
});
