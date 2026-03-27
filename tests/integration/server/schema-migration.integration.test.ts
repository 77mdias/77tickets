import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";

import { cleanDatabase, createTestDb } from "../setup";
import {
  coupons,
  events,
  lots,
  orderItems,
  orders,
  tickets,
} from "../../../src/server/infrastructure/db/schema";

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "schema migration integrity",
  () => {
    const db = createTestDb();

    test("events table accepts valid insert", async () => {
      await cleanDatabase(db);

      const result = await db
        .insert(events)
        .values({
          organizerId: "00000000-0000-0000-0000-000000000001",
          slug: "test-event-001",
          title: "Test Event",
          status: "draft",
          startsAt: new Date("2027-01-01T10:00:00Z"),
          endsAt: new Date("2027-01-01T20:00:00Z"),
        })
        .returning();

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe("test-event-001");
    });

    test("events slug unique constraint rejects duplicate", async () => {
      await cleanDatabase(db);

      const base = {
        organizerId: "00000000-0000-0000-0000-000000000001",
        slug: "duplicate-slug",
        title: "Event A",
        status: "draft" as const,
        startsAt: new Date("2027-01-01T10:00:00Z"),
        endsAt: new Date("2027-01-01T20:00:00Z"),
      };

      await db.insert(events).values(base);

      await expect(
        db.insert(events).values({ ...base, title: "Event B" }),
      ).rejects.toThrow();
    });

    test("lots FK constraint rejects non-existent event_id", async () => {
      await cleanDatabase(db);

      await expect(
        db.insert(lots).values({
          eventId: "00000000-0000-0000-0000-000000000999",
          title: "Lot A",
          priceInCents: 5000,
          totalQuantity: 100,
          availableQuantity: 100,
          maxPerOrder: 4,
          status: "active",
        }),
      ).rejects.toThrow();
    });

    test("lots accepts valid insert referencing existing event", async () => {
      await cleanDatabase(db);

      const [event] = await db
        .insert(events)
        .values({
          organizerId: "00000000-0000-0000-0000-000000000001",
          slug: "event-for-lot",
          title: "Event",
          status: "published",
          startsAt: new Date("2027-06-01T10:00:00Z"),
          endsAt: new Date("2027-06-01T20:00:00Z"),
        })
        .returning();

      const [lot] = await db
        .insert(lots)
        .values({
          eventId: event.id,
          title: "General Admission",
          priceInCents: 10000,
          totalQuantity: 200,
          availableQuantity: 200,
          maxPerOrder: 4,
          status: "active",
        })
        .returning();

      expect(lot.eventId).toBe(event.id);
    });

    test("order_items cascade deletes when order is deleted", async () => {
      await cleanDatabase(db);

      const [event] = await db
        .insert(events)
        .values({
          organizerId: "00000000-0000-0000-0000-000000000001",
          slug: "event-cascade",
          title: "Cascade Event",
          status: "published",
          startsAt: new Date("2027-06-01T10:00:00Z"),
          endsAt: new Date("2027-06-01T20:00:00Z"),
        })
        .returning();

      const [lot] = await db
        .insert(lots)
        .values({
          eventId: event.id,
          title: "VIP",
          priceInCents: 20000,
          totalQuantity: 50,
          availableQuantity: 50,
          maxPerOrder: 2,
          status: "active",
        })
        .returning();

      const [order] = await db
        .insert(orders)
        .values({
          customerId: "00000000-0000-0000-0000-000000000002",
          eventId: event.id,
          status: "pending",
          subtotalInCents: 20000,
          discountInCents: 0,
          totalInCents: 20000,
        })
        .returning();

      await db.insert(orderItems).values({
        orderId: order.id,
        lotId: lot.id,
        quantity: 1,
        unitPriceInCents: 20000,
      });

      await db.delete(orders).where(eq(orders.id, order.id));

      const remainingItems = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      expect(remainingItems).toHaveLength(0);
    });

    test("tickets code unique constraint rejects duplicate", async () => {
      await cleanDatabase(db);

      const [event] = await db
        .insert(events)
        .values({
          organizerId: "00000000-0000-0000-0000-000000000001",
          slug: "event-tickets",
          title: "Ticket Event",
          status: "published",
          startsAt: new Date("2027-06-01T10:00:00Z"),
          endsAt: new Date("2027-06-01T20:00:00Z"),
        })
        .returning();

      const [lot] = await db
        .insert(lots)
        .values({
          eventId: event.id,
          title: "Standard",
          priceInCents: 5000,
          totalQuantity: 100,
          availableQuantity: 100,
          maxPerOrder: 4,
          status: "active",
        })
        .returning();

      const [order] = await db
        .insert(orders)
        .values({
          customerId: "00000000-0000-0000-0000-000000000002",
          eventId: event.id,
          status: "paid",
          subtotalInCents: 5000,
          discountInCents: 0,
          totalInCents: 5000,
        })
        .returning();

      await db.insert(tickets).values({
        eventId: event.id,
        orderId: order.id,
        lotId: lot.id,
        code: "TICKET-UNIQUE-001",
        status: "active",
      });

      await expect(
        db.insert(tickets).values({
          eventId: event.id,
          orderId: order.id,
          lotId: lot.id,
          code: "TICKET-UNIQUE-001",
          status: "active",
        }),
      ).rejects.toThrow();
    });

    test("coupons (event_id, code) unique constraint rejects duplicate per event", async () => {
      await cleanDatabase(db);

      const [event] = await db
        .insert(events)
        .values({
          organizerId: "00000000-0000-0000-0000-000000000001",
          slug: "event-coupons",
          title: "Coupon Event",
          status: "published",
          startsAt: new Date("2027-06-01T10:00:00Z"),
          endsAt: new Date("2027-06-01T20:00:00Z"),
        })
        .returning();

      const couponBase = {
        eventId: event.id,
        code: "SAVE10",
        discountType: "percentage" as const,
        discountPercentage: 10,
        maxRedemptions: 100,
        redemptionCount: 0,
        validFrom: new Date("2027-01-01T00:00:00Z"),
        validUntil: new Date("2027-12-31T23:59:59Z"),
      };

      await db.insert(coupons).values(couponBase);

      await expect(
        db.insert(coupons).values(couponBase),
      ).rejects.toThrow();
    });
  },
);
