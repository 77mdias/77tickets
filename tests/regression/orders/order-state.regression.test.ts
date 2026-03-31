import { describe, expect, test, vi } from "vitest";

import {
  isOrderStatusEligibleForActiveTicket,
  validateOrderTransition,
} from "@/server/domain/orders/order.rules";
import type { Ticket } from "@/server/domain/tickets";
import { isTicketValidForCheckin } from "@/server/domain/tickets/ticket.rules";
import { createCreateOrderUseCase } from "@/server/application/use-cases/create-order.use-case";

const FIXED_NOW = new Date("2026-03-31T12:00:00.000Z");
const EVENT_ID = "evt-purchase-reg-001";
const LOT_ID = "lot-purchase-reg-001";
const CUSTOMER_ID = "customer-purchase-reg-001";

function makeActiveLot(overrides: Partial<{
  id: string;
  eventId: string;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
}> = {}) {
  return {
    id: LOT_ID,
    eventId: EVENT_ID,
    title: "Regression Lot",
    priceInCents: 5000,
    totalQuantity: 100,
    availableQuantity: 10,
    maxPerOrder: 5,
    saleStartsAt: new Date("2026-01-01T00:00:00.000Z"),
    saleEndsAt: new Date("2026-12-31T23:59:59.000Z"),
    status: "active" as const,
    ...overrides,
  };
}

function makeBaseDependencies(overrides: Partial<Parameters<typeof createCreateOrderUseCase>[0]> = {}) {
  return {
    now: () => FIXED_NOW,
    generateOrderId: () => "ord-purchase-reg-001",
    orderRepository: {
      create: vi.fn(async () => ({ order: { id: "ord-purchase-reg-001" }, items: [] })),
    },
    lotRepository: {
      findByIds: vi.fn(async (ids: string[]) =>
        ids.includes(LOT_ID) ? [makeActiveLot()] : [],
      ),
      decrementAvailableQuantity: vi.fn(async () => true),
    },
    couponRepository: {
      findByCodeForEvent: vi.fn(async () => null),
      incrementRedemptionCount: vi.fn(async () => undefined),
    },
    ...overrides,
  };
}

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "tkt-ord-reg-001",
    eventId: "evt-ord-reg-001",
    orderId: "ord-ord-reg-001",
    lotId: "lot-ord-reg-001",
    code: "ORD-REG-001",
    status: "active",
    checkedInAt: null,
    ...overrides,
  };
}

describe("ORD-004 regression coverage: order expiration and invalid state", () => {
  test("expired order is not eligible to keep active ticket", () => {
    expect(isOrderStatusEligibleForActiveTicket("expired")).toBe(false);
    expect(isTicketValidForCheckin(makeTicket(), "expired")).toEqual({
      ok: false,
      reason: "order_not_paid",
    });
  });

  test("rejects invalid transition from paid to expired", () => {
    expect(validateOrderTransition("paid", "expired")).toEqual({
      ok: false,
      reason: "invalid_transition",
    });
  });
});

describe("Purchase flow regression: lot sale window and coupon validation", () => {
  test("purchase fails when lot sale window has expired", async () => {
    // saleEndsAt is in the past relative to FIXED_NOW (2026-03-31)
    const expiredLot = makeActiveLot({
      saleStartsAt: new Date("2026-01-01T00:00:00.000Z"),
      saleEndsAt: new Date("2026-02-28T23:59:59.000Z"), // expired before FIXED_NOW
    });

    const deps = makeBaseDependencies({
      lotRepository: {
        findByIds: vi.fn(async (ids: string[]) =>
          ids.includes(LOT_ID) ? [expiredLot] : [],
        ),
        decrementAvailableQuantity: vi.fn(async () => true),
      },
    });

    const createOrder = createCreateOrderUseCase(deps);

    await expect(
      createOrder({
        eventId: EVENT_ID,
        customerId: CUSTOMER_ID,
        items: [{ lotId: LOT_ID, quantity: 1 }],
      }),
    ).rejects.toMatchObject({
      code: "conflict",
      details: { reason: "out_of_window" },
    });
  });

  test("purchase fails when lot sale window has not yet started", async () => {
    // saleStartsAt is in the future relative to FIXED_NOW (2026-03-31)
    const futureLot = makeActiveLot({
      saleStartsAt: new Date("2026-06-01T00:00:00.000Z"), // not yet started
      saleEndsAt: new Date("2026-12-31T23:59:59.000Z"),
    });

    const deps = makeBaseDependencies({
      lotRepository: {
        findByIds: vi.fn(async (ids: string[]) =>
          ids.includes(LOT_ID) ? [futureLot] : [],
        ),
        decrementAvailableQuantity: vi.fn(async () => true),
      },
    });

    const createOrder = createCreateOrderUseCase(deps);

    await expect(
      createOrder({
        eventId: EVENT_ID,
        customerId: CUSTOMER_ID,
        items: [{ lotId: LOT_ID, quantity: 1 }],
      }),
    ).rejects.toMatchObject({
      code: "conflict",
      details: { reason: "out_of_window" },
    });
  });

  test("purchase fails when coupon code is invalid (not found for event)", async () => {
    const deps = makeBaseDependencies({
      couponRepository: {
        // findByCodeForEvent returns null → invalid coupon
        findByCodeForEvent: vi.fn(async () => null),
        incrementRedemptionCount: vi.fn(async () => undefined),
      },
    });

    const createOrder = createCreateOrderUseCase(deps);

    await expect(
      createOrder({
        eventId: EVENT_ID,
        customerId: CUSTOMER_ID,
        items: [{ lotId: LOT_ID, quantity: 1 }],
        couponCode: "INVALID-COUPON",
      }),
    ).rejects.toMatchObject({
      code: "conflict",
      details: { reason: "invalid_coupon" },
    });
  });
});
