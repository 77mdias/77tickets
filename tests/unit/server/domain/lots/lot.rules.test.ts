import { describe, expect, test } from "vitest";

import {
  hasLotSufficientStock,
  isLotActive,
  isLotInSaleWindow,
  isWithinPerOrderLimit,
  validateLotForPurchase,
} from "@/src/server/domain/lots/lot.rules";

import type { Lot } from "@/src/server/domain/lots";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeLot(overrides: Partial<Lot> = {}): Lot {
  return {
    id: "lot-001",
    eventId: "evt-001",
    title: "Early Bird",
    priceInCents: 5000,
    totalQuantity: 100,
    availableQuantity: 50,
    maxPerOrder: 4,
    saleStartsAt: new Date("2026-05-01T00:00:00.000Z"),
    saleEndsAt: new Date("2026-05-31T23:59:59.000Z"),
    status: "active",
    ...overrides,
  };
}

// ─── isLotInSaleWindow ────────────────────────────────────────────────────────

describe("isLotInSaleWindow", () => {
  test("returns false when now is before saleStartsAt", () => {
    const lot = makeLot({
      saleStartsAt: new Date("2026-05-01T00:00:00.000Z"),
      saleEndsAt: new Date("2026-05-31T23:59:59.000Z"),
    });

    expect(isLotInSaleWindow(lot, new Date("2026-04-30T23:59:59.000Z"))).toBe(false);
  });

  test("returns true when now is exactly at saleStartsAt", () => {
    const lot = makeLot({
      saleStartsAt: new Date("2026-05-01T00:00:00.000Z"),
      saleEndsAt: new Date("2026-05-31T23:59:59.000Z"),
    });

    expect(isLotInSaleWindow(lot, new Date("2026-05-01T00:00:00.000Z"))).toBe(true);
  });

  test("returns true when now is between start and end", () => {
    const lot = makeLot({
      saleStartsAt: new Date("2026-05-01T00:00:00.000Z"),
      saleEndsAt: new Date("2026-05-31T23:59:59.000Z"),
    });

    expect(isLotInSaleWindow(lot, new Date("2026-05-15T12:00:00.000Z"))).toBe(true);
  });

  test("returns false when now is after saleEndsAt", () => {
    const lot = makeLot({
      saleStartsAt: new Date("2026-05-01T00:00:00.000Z"),
      saleEndsAt: new Date("2026-05-31T23:59:59.000Z"),
    });

    expect(isLotInSaleWindow(lot, new Date("2026-06-01T00:00:00.000Z"))).toBe(false);
  });

  test("returns true when saleEndsAt is null and now is after saleStartsAt", () => {
    const lot = makeLot({
      saleStartsAt: new Date("2026-05-01T00:00:00.000Z"),
      saleEndsAt: null,
    });

    expect(isLotInSaleWindow(lot, new Date("2026-12-31T23:59:59.000Z"))).toBe(true);
  });
});

// ─── isLotActive ──────────────────────────────────────────────────────────────

describe("isLotActive", () => {
  test("returns true when status is active", () => {
    expect(isLotActive(makeLot({ status: "active" }))).toBe(true);
  });

  test("returns false when status is paused", () => {
    expect(isLotActive(makeLot({ status: "paused" }))).toBe(false);
  });

  test("returns false when status is sold_out", () => {
    expect(isLotActive(makeLot({ status: "sold_out" }))).toBe(false);
  });

  test("returns false when status is closed", () => {
    expect(isLotActive(makeLot({ status: "closed" }))).toBe(false);
  });
});

// ─── isWithinPerOrderLimit ────────────────────────────────────────────────────

describe("isWithinPerOrderLimit", () => {
  test("returns true when quantity is below maxPerOrder", () => {
    expect(isWithinPerOrderLimit(makeLot({ maxPerOrder: 4 }), 3)).toBe(true);
  });

  test("returns true when quantity equals maxPerOrder", () => {
    expect(isWithinPerOrderLimit(makeLot({ maxPerOrder: 4 }), 4)).toBe(true);
  });

  test("returns false when quantity exceeds maxPerOrder", () => {
    expect(isWithinPerOrderLimit(makeLot({ maxPerOrder: 4 }), 5)).toBe(false);
  });
});

// ─── hasLotSufficientStock ────────────────────────────────────────────────────

describe("hasLotSufficientStock", () => {
  test("returns true when availableQuantity is greater than requested", () => {
    expect(hasLotSufficientStock(makeLot({ availableQuantity: 50 }), 10)).toBe(true);
  });

  test("returns true when availableQuantity exactly equals requested", () => {
    expect(hasLotSufficientStock(makeLot({ availableQuantity: 10 }), 10)).toBe(true);
  });

  test("returns false when availableQuantity is less than requested", () => {
    expect(hasLotSufficientStock(makeLot({ availableQuantity: 5 }), 10)).toBe(false);
  });

  test("returns false when availableQuantity is zero", () => {
    expect(hasLotSufficientStock(makeLot({ availableQuantity: 0 }), 1)).toBe(false);
  });
});

// ─── validateLotForPurchase ───────────────────────────────────────────────────

describe("validateLotForPurchase", () => {
  const now = new Date("2026-05-15T12:00:00.000Z");

  test("returns ok:true when all conditions are met", () => {
    const lot = makeLot({
      status: "active",
      saleStartsAt: new Date("2026-05-01T00:00:00.000Z"),
      saleEndsAt: new Date("2026-05-31T23:59:59.000Z"),
      maxPerOrder: 4,
      availableQuantity: 50,
    });

    expect(validateLotForPurchase(lot, 2, now)).toEqual({ ok: true });
  });

  test("returns out_of_window when now is before saleStartsAt", () => {
    const lot = makeLot({
      saleStartsAt: new Date("2026-06-01T00:00:00.000Z"),
      saleEndsAt: new Date("2026-06-30T23:59:59.000Z"),
    });

    expect(validateLotForPurchase(lot, 1, now)).toEqual({
      ok: false,
      reason: "out_of_window",
    });
  });

  test("returns lot_not_active when lot is paused", () => {
    const lot = makeLot({
      status: "paused",
      saleStartsAt: new Date("2026-05-01T00:00:00.000Z"),
      saleEndsAt: new Date("2026-05-31T23:59:59.000Z"),
    });

    expect(validateLotForPurchase(lot, 1, now)).toEqual({
      ok: false,
      reason: "lot_not_active",
    });
  });

  test("returns exceeds_per_order_limit when quantity exceeds maxPerOrder", () => {
    const lot = makeLot({
      status: "active",
      saleStartsAt: new Date("2026-05-01T00:00:00.000Z"),
      saleEndsAt: new Date("2026-05-31T23:59:59.000Z"),
      maxPerOrder: 4,
      availableQuantity: 50,
    });

    expect(validateLotForPurchase(lot, 5, now)).toEqual({
      ok: false,
      reason: "exceeds_per_order_limit",
    });
  });

  test("returns insufficient_stock when not enough available", () => {
    const lot = makeLot({
      status: "active",
      saleStartsAt: new Date("2026-05-01T00:00:00.000Z"),
      saleEndsAt: new Date("2026-05-31T23:59:59.000Z"),
      maxPerOrder: 10,
      availableQuantity: 2,
    });

    expect(validateLotForPurchase(lot, 5, now)).toEqual({
      ok: false,
      reason: "insufficient_stock",
    });
  });

  test("out_of_window takes priority over lot_not_active", () => {
    const lot = makeLot({
      status: "paused",
      saleStartsAt: new Date("2026-06-01T00:00:00.000Z"),
      saleEndsAt: new Date("2026-06-30T23:59:59.000Z"),
    });

    expect(validateLotForPurchase(lot, 1, now)).toEqual({
      ok: false,
      reason: "out_of_window",
    });
  });
});
