/**
 * Test fixtures barrel.
 *
 * Factory functions for each domain entity. Pattern:
 *
 * @example
 * ```ts
 * import { createEventFixture } from "../../fixtures";
 *
 * const event = await createEventFixture(db, { title: "My Event" });
 * ```
 *
 * Each factory accepts a `db` instance from `createTestDb()` and an optional
 * partial override object. It inserts a row and returns the inserted record.
 * Cleanup is handled by `cleanDatabase(db)` per-test — factories do not
 * need to track what they create.
 */

import type { Db } from "../../src/server/infrastructure/db/client";
import {
  coupons,
  events,
  lots,
  orderItems,
  orders,
  tickets,
  user,
} from "../../src/server/infrastructure/db/schema";
import type { UserRole } from "../../src/server/infrastructure/db/schema/users";

// ─── Users ────────────────────────────────────────────────────────────────────

type UserInsert = typeof user.$inferInsert;
type UserRow = typeof user.$inferSelect;

export async function createUserFixture(
  db: Db,
  overrides: Partial<UserInsert> = {},
): Promise<UserRow> {
  const defaults: UserInsert = {
    email: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.local`,
    name: "Test User",
    role: "customer" as UserRole,
    emailVerified: false,
  };

  const [row] = await db
    .insert(user)
    .values({ ...defaults, ...overrides })
    .returning();

  return row;
}

// ─── Events ──────────────────────────────────────────────────────────────────

type EventInsert = typeof events.$inferInsert;
type EventRow = typeof events.$inferSelect;

export async function createEventFixture(
  db: Db,
  overrides: Partial<EventInsert> = {},
): Promise<EventRow> {
  const defaults: EventInsert = {
    organizerId: "00000000-0000-0000-0000-000000000001",
    slug: `test-event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: "Test Event",
    status: "draft",
    startsAt: new Date("2027-06-01T10:00:00Z"),
    endsAt: new Date("2027-06-01T20:00:00Z"),
  };

  const [row] = await db
    .insert(events)
    .values({ ...defaults, ...overrides })
    .returning();

  return row;
}

// ─── Lots ─────────────────────────────────────────────────────────────────────

type LotInsert = typeof lots.$inferInsert;
type LotRow = typeof lots.$inferSelect;

export async function createLotFixture(
  db: Db,
  eventId: string,
  overrides: Partial<LotInsert> = {},
): Promise<LotRow> {
  const defaults: LotInsert = {
    eventId,
    title: "General Admission",
    priceInCents: 10000,
    totalQuantity: 100,
    availableQuantity: 100,
    maxPerOrder: 4,
    status: "active",
  };

  const [row] = await db
    .insert(lots)
    .values({ ...defaults, ...overrides })
    .returning();

  return row;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

type OrderInsert = typeof orders.$inferInsert;
type OrderRow = typeof orders.$inferSelect;

export async function createOrderFixture(
  db: Db,
  eventId: string,
  overrides: Partial<OrderInsert> = {},
): Promise<OrderRow> {
  const defaults: OrderInsert = {
    customerId: "00000000-0000-0000-0000-000000000002",
    eventId,
    status: "pending",
    subtotalInCents: 10000,
    discountInCents: 0,
    totalInCents: 10000,
  };

  const [row] = await db
    .insert(orders)
    .values({ ...defaults, ...overrides })
    .returning();

  return row;
}

// ─── Order Items ──────────────────────────────────────────────────────────────

type OrderItemInsert = typeof orderItems.$inferInsert;
type OrderItemRow = typeof orderItems.$inferSelect;

export async function createOrderItemFixture(
  db: Db,
  orderId: string,
  lotId: string,
  overrides: Partial<OrderItemInsert> = {},
): Promise<OrderItemRow> {
  const defaults: OrderItemInsert = {
    orderId,
    lotId,
    quantity: 1,
    unitPriceInCents: 10000,
  };

  const [row] = await db
    .insert(orderItems)
    .values({ ...defaults, ...overrides })
    .returning();

  return row;
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

type TicketInsert = typeof tickets.$inferInsert;
type TicketRow = typeof tickets.$inferSelect;

export async function createTicketFixture(
  db: Db,
  refs: { eventId: string; orderId: string; lotId: string },
  overrides: Partial<TicketInsert> = {},
): Promise<TicketRow> {
  const defaults: TicketInsert = {
    eventId: refs.eventId,
    orderId: refs.orderId,
    lotId: refs.lotId,
    code: `TKT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    status: "active",
  };

  const [row] = await db
    .insert(tickets)
    .values({ ...defaults, ...overrides })
    .returning();

  return row;
}

// ─── Coupons ──────────────────────────────────────────────────────────────────

type CouponInsert = typeof coupons.$inferInsert;
type CouponRow = typeof coupons.$inferSelect;

export async function createCouponFixture(
  db: Db,
  eventId: string,
  overrides: Partial<CouponInsert> = {},
): Promise<CouponRow> {
  const defaults: CouponInsert = {
    eventId,
    code: `SAVE${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    discountType: "percentage",
    discountPercentage: 10,
    discountInCents: null,
    maxRedemptions: 100,
    redemptionCount: 0,
    validFrom: new Date("2027-01-01T00:00:00Z"),
    validUntil: new Date("2027-12-31T23:59:59Z"),
  };

  const [row] = await db
    .insert(coupons)
    .values({ ...defaults, ...overrides })
    .returning();

  return row;
}
