import { describe, expect, test } from "vitest";

import {
  applyCouponDiscount,
  isCouponApplicableToEvent,
  isCouponInValidWindow,
  isCouponWithinRedemptionLimit,
  validateCouponEligibility,
} from "@/src/server/domain/coupons/coupon.rules";

import type { Coupon } from "@/src/server/domain/coupons";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "cpn-001",
    eventId: "evt-001",
    code: "WELCOME10",
    discountType: "fixed",
    discountInCents: 1000,
    discountPercentage: null,
    maxRedemptions: 50,
    redemptionCount: 0,
    validFrom: new Date("2026-05-01T00:00:00.000Z"),
    validUntil: new Date("2026-05-31T23:59:59.000Z"),
    ...overrides,
  };
}

// ─── isCouponInValidWindow ────────────────────────────────────────────────────

describe("isCouponInValidWindow", () => {
  test("returns false when now is before validFrom", () => {
    const coupon = makeCoupon({
      validFrom: new Date("2026-05-01T00:00:00.000Z"),
      validUntil: new Date("2026-05-31T23:59:59.000Z"),
    });

    expect(isCouponInValidWindow(coupon, new Date("2026-04-30T23:59:59.000Z"))).toBe(false);
  });

  test("returns true when now is exactly at validFrom", () => {
    const coupon = makeCoupon({
      validFrom: new Date("2026-05-01T00:00:00.000Z"),
      validUntil: new Date("2026-05-31T23:59:59.000Z"),
    });

    expect(isCouponInValidWindow(coupon, new Date("2026-05-01T00:00:00.000Z"))).toBe(true);
  });

  test("returns true when now is between validFrom and validUntil", () => {
    const coupon = makeCoupon({
      validFrom: new Date("2026-05-01T00:00:00.000Z"),
      validUntil: new Date("2026-05-31T23:59:59.000Z"),
    });

    expect(isCouponInValidWindow(coupon, new Date("2026-05-15T12:00:00.000Z"))).toBe(true);
  });

  test("returns true when now is exactly at validUntil", () => {
    const coupon = makeCoupon({
      validFrom: new Date("2026-05-01T00:00:00.000Z"),
      validUntil: new Date("2026-05-31T23:59:59.000Z"),
    });

    expect(isCouponInValidWindow(coupon, new Date("2026-05-31T23:59:59.000Z"))).toBe(true);
  });

  test("returns false when now is after validUntil", () => {
    const coupon = makeCoupon({
      validFrom: new Date("2026-05-01T00:00:00.000Z"),
      validUntil: new Date("2026-05-31T23:59:59.000Z"),
    });

    expect(isCouponInValidWindow(coupon, new Date("2026-06-01T00:00:00.000Z"))).toBe(false);
  });
});

// ─── isCouponWithinRedemptionLimit ────────────────────────────────────────────

describe("isCouponWithinRedemptionLimit", () => {
  test("returns true when maxRedemptions is null (unlimited)", () => {
    expect(isCouponWithinRedemptionLimit(makeCoupon({ maxRedemptions: null, redemptionCount: 9999 }))).toBe(true);
  });

  test("returns true when redemptionCount is below maxRedemptions", () => {
    expect(isCouponWithinRedemptionLimit(makeCoupon({ maxRedemptions: 50, redemptionCount: 10 }))).toBe(true);
  });

  test("returns false when redemptionCount equals maxRedemptions", () => {
    expect(isCouponWithinRedemptionLimit(makeCoupon({ maxRedemptions: 50, redemptionCount: 50 }))).toBe(false);
  });

  test("returns false when redemptionCount exceeds maxRedemptions", () => {
    expect(isCouponWithinRedemptionLimit(makeCoupon({ maxRedemptions: 50, redemptionCount: 51 }))).toBe(false);
  });
});

// ─── isCouponApplicableToEvent ────────────────────────────────────────────────

describe("isCouponApplicableToEvent", () => {
  test("returns true when coupon eventId matches the target event", () => {
    const coupon = makeCoupon({ eventId: "evt-001" });
    expect(isCouponApplicableToEvent(coupon, "evt-001")).toBe(true);
  });

  test("returns false when coupon eventId does not match the target event", () => {
    const coupon = makeCoupon({ eventId: "evt-001" });
    expect(isCouponApplicableToEvent(coupon, "evt-999")).toBe(false);
  });
});

// ─── validateCouponEligibility ────────────────────────────────────────────────

describe("validateCouponEligibility", () => {
  const now = new Date("2026-05-15T12:00:00.000Z");

  test("returns ok:true when all conditions are met", () => {
    const coupon = makeCoupon({
      eventId: "evt-001",
      validFrom: new Date("2026-05-01T00:00:00.000Z"),
      validUntil: new Date("2026-05-31T23:59:59.000Z"),
      maxRedemptions: 50,
      redemptionCount: 0,
    });

    expect(validateCouponEligibility(coupon, "evt-001", now)).toEqual({ ok: true });
  });

  test("returns out_of_window when now is before validFrom", () => {
    const coupon = makeCoupon({
      validFrom: new Date("2026-06-01T00:00:00.000Z"),
      validUntil: new Date("2026-06-30T23:59:59.000Z"),
    });

    expect(validateCouponEligibility(coupon, "evt-001", now)).toEqual({
      ok: false,
      reason: "out_of_window",
    });
  });

  test("returns out_of_window when coupon is expired", () => {
    const coupon = makeCoupon({
      validFrom: new Date("2026-04-01T00:00:00.000Z"),
      validUntil: new Date("2026-04-30T23:59:59.000Z"),
    });

    expect(validateCouponEligibility(coupon, "evt-001", now)).toEqual({
      ok: false,
      reason: "out_of_window",
    });
  });

  test("returns redemption_limit_reached when limit is exhausted", () => {
    const coupon = makeCoupon({
      validFrom: new Date("2026-05-01T00:00:00.000Z"),
      validUntil: new Date("2026-05-31T23:59:59.000Z"),
      maxRedemptions: 50,
      redemptionCount: 50,
    });

    expect(validateCouponEligibility(coupon, "evt-001", now)).toEqual({
      ok: false,
      reason: "redemption_limit_reached",
    });
  });

  test("returns wrong_event when coupon belongs to a different event", () => {
    const coupon = makeCoupon({
      eventId: "evt-999",
      validFrom: new Date("2026-05-01T00:00:00.000Z"),
      validUntil: new Date("2026-05-31T23:59:59.000Z"),
      maxRedemptions: 50,
      redemptionCount: 0,
    });

    expect(validateCouponEligibility(coupon, "evt-001", now)).toEqual({
      ok: false,
      reason: "wrong_event",
    });
  });

  test("out_of_window takes priority over redemption_limit_reached", () => {
    const coupon = makeCoupon({
      validFrom: new Date("2026-06-01T00:00:00.000Z"),
      validUntil: new Date("2026-06-30T23:59:59.000Z"),
      maxRedemptions: 50,
      redemptionCount: 50,
    });

    expect(validateCouponEligibility(coupon, "evt-001", now)).toEqual({
      ok: false,
      reason: "out_of_window",
    });
  });

  test("redemption_limit_reached takes priority over wrong_event", () => {
    const coupon = makeCoupon({
      eventId: "evt-999",
      validFrom: new Date("2026-05-01T00:00:00.000Z"),
      validUntil: new Date("2026-05-31T23:59:59.000Z"),
      maxRedemptions: 50,
      redemptionCount: 50,
    });

    expect(validateCouponEligibility(coupon, "evt-001", now)).toEqual({
      ok: false,
      reason: "redemption_limit_reached",
    });
  });

  test("returns ok:true for unlimited coupon with zero redemptions", () => {
    const coupon = makeCoupon({
      eventId: "evt-001",
      validFrom: new Date("2026-05-01T00:00:00.000Z"),
      validUntil: new Date("2026-05-31T23:59:59.000Z"),
      maxRedemptions: null,
      redemptionCount: 0,
    });

    expect(validateCouponEligibility(coupon, "evt-001", now)).toEqual({ ok: true });
  });
});

// ─── applyCouponDiscount ──────────────────────────────────────────────────────

describe("applyCouponDiscount", () => {
  test("returns fixed discount amount when type is fixed", () => {
    const coupon = makeCoupon({ discountType: "fixed", discountInCents: 1000, discountPercentage: null });
    expect(applyCouponDiscount(coupon, 5000)).toBe(1000);
  });

  test("caps fixed discount at subtotal to avoid negative total", () => {
    const coupon = makeCoupon({ discountType: "fixed", discountInCents: 8000, discountPercentage: null });
    expect(applyCouponDiscount(coupon, 5000)).toBe(5000);
  });

  test("returns percentage discount amount when type is percentage", () => {
    const coupon = makeCoupon({ discountType: "percentage", discountInCents: null, discountPercentage: 20 });
    expect(applyCouponDiscount(coupon, 10000)).toBe(2000);
  });

  test("floors fractional cents for percentage discount", () => {
    const coupon = makeCoupon({ discountType: "percentage", discountInCents: null, discountPercentage: 10 });
    // 10% of 9999 = 999.9 → floor → 999
    expect(applyCouponDiscount(coupon, 9999)).toBe(999);
  });

  test("returns 0 when fixed type has null discountInCents", () => {
    const coupon = makeCoupon({ discountType: "fixed", discountInCents: null, discountPercentage: null });
    expect(applyCouponDiscount(coupon, 5000)).toBe(0);
  });

  test("returns 0 when percentage type has null discountPercentage", () => {
    const coupon = makeCoupon({ discountType: "percentage", discountInCents: null, discountPercentage: null });
    expect(applyCouponDiscount(coupon, 5000)).toBe(0);
  });

  test("returns 0 discount for 0% coupon", () => {
    const coupon = makeCoupon({ discountType: "percentage", discountInCents: null, discountPercentage: 0 });
    expect(applyCouponDiscount(coupon, 5000)).toBe(0);
  });
});
