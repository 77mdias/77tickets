import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import type { Event, EventLifecycleStatus } from "@/src/server/domain/events";
import type { Lot, LotStatus } from "@/src/server/domain/lots";
import type { Order, OrderItem, OrderStatus } from "@/src/server/domain/orders";
import type { Ticket, TicketStatus } from "@/src/server/domain/tickets";
import type { Coupon, DiscountType } from "@/src/server/domain/coupons";

// ─── Structural: no forbidden imports ────────────────────────────────────────

const domainFiles = [
  "src/server/domain/shared.types.ts",
  "src/server/domain/events/event.types.ts",
  "src/server/domain/lots/lot.types.ts",
  "src/server/domain/orders/order.types.ts",
  "src/server/domain/tickets/ticket.types.ts",
  "src/server/domain/coupons/coupon.types.ts",
] as const;

const forbiddenDependencies = [
  "drizzle",
  "vinext",
  "next/",
  "@neondatabase",
  "../repositories",
  "../infrastructure",
  "../api",
  "../application",
];

test("domain files have no forbidden dependencies", () => {
  for (const relativePath of domainFiles) {
    const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");

    for (const dep of forbiddenDependencies) {
      expect(source, `${relativePath} must not import "${dep}"`).not.toContain(dep);
    }
  }
});

// ─── Runtime: entity shapes ───────────────────────────────────────────────────

describe("Event entity", () => {
  test("accepts a valid Event object", () => {
    const event: Event = {
      id: "evt-001",
      organizerId: "usr-001",
      slug: "test-event-2026",
      title: "Test Event",
      status: "draft",
      startsAt: new Date("2026-06-01"),
      endsAt: null,
    };

    expect(event.id).toBe("evt-001");
    expect(event.status).toBe("draft");
  });

  test("EventLifecycleStatus covers draft, published, cancelled", () => {
    const statuses: EventLifecycleStatus[] = ["draft", "published", "cancelled"];
    expect(statuses).toHaveLength(3);
  });
});

describe("Lot entity", () => {
  test("accepts a valid Lot object", () => {
    const lot: Lot = {
      id: "lot-001",
      eventId: "evt-001",
      title: "Early Bird",
      priceInCents: 5000,
      totalQuantity: 100,
      availableQuantity: 100,
      maxPerOrder: 4,
      saleStartsAt: new Date("2026-05-01"),
      saleEndsAt: new Date("2026-05-31"),
      status: "active",
    };

    expect(lot.id).toBe("lot-001");
    expect(lot.priceInCents).toBe(5000);
  });

  test("LotStatus covers active, paused, sold_out, closed", () => {
    const statuses: LotStatus[] = ["active", "paused", "sold_out", "closed"];
    expect(statuses).toHaveLength(4);
  });
});

describe("Order entity", () => {
  test("accepts a valid Order with items", () => {
    const item: OrderItem = {
      lotId: "lot-001",
      quantity: 2,
      unitPriceInCents: 5000,
    };

    const order: Order = {
      id: "ord-001",
      customerId: "usr-002",
      eventId: "evt-001",
      status: "pending",
      items: [item],
      subtotalInCents: 10000,
      discountInCents: 0,
      totalInCents: 10000,
      createdAt: new Date(),
    };

    expect(order.id).toBe("ord-001");
    expect(order.items).toHaveLength(1);
    expect(order.totalInCents).toBe(10000);
  });

  test("OrderStatus covers pending, paid, expired, cancelled", () => {
    const statuses: OrderStatus[] = ["pending", "paid", "expired", "cancelled"];
    expect(statuses).toHaveLength(4);
  });
});

describe("Ticket entity", () => {
  test("accepts a valid Ticket object", () => {
    const ticket: Ticket = {
      id: "tkt-001",
      eventId: "evt-001",
      orderId: "ord-001",
      lotId: "lot-001",
      code: "TKT-ABCD-1234",
      status: "active",
      checkedInAt: null,
    };

    expect(ticket.id).toBe("tkt-001");
    expect(ticket.checkedInAt).toBeNull();
  });

  test("TicketStatus covers active, used, cancelled", () => {
    const statuses: TicketStatus[] = ["active", "used", "cancelled"];
    expect(statuses).toHaveLength(3);
  });
});

describe("Coupon entity", () => {
  test("accepts a fixed-amount Coupon", () => {
    const coupon: Coupon = {
      id: "cpn-001",
      eventId: "evt-001",
      code: "WELCOME10",
      discountType: "fixed",
      discountInCents: 1000,
      discountPercentage: null,
      maxRedemptions: 50,
      redemptionCount: 0,
      validFrom: new Date("2026-05-01"),
      validUntil: new Date("2026-05-31"),
    };

    expect(coupon.discountInCents).toBe(1000);
    expect(coupon.discountPercentage).toBeNull();
  });

  test("accepts a percentage Coupon", () => {
    const coupon: Coupon = {
      id: "cpn-002",
      eventId: "evt-001",
      code: "SAVE20",
      discountType: "percentage",
      discountInCents: null,
      discountPercentage: 20,
      maxRedemptions: null,
      redemptionCount: 0,
      validFrom: new Date("2026-05-01"),
      validUntil: new Date("2026-05-31"),
    };

    expect(coupon.discountPercentage).toBe(20);
  });

  test("DiscountType covers fixed and percentage", () => {
    const types: DiscountType[] = ["fixed", "percentage"];
    expect(types).toHaveLength(2);
  });
});
