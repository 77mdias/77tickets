import type { EntityId } from "../shared.types";
import type { Coupon } from "./coupon.types";

export type CouponEligibilityReason =
  | "out_of_window"
  | "redemption_limit_reached"
  | "wrong_event";

export type CouponEligibilityResult =
  | { ok: true }
  | { ok: false; reason: CouponEligibilityReason };

export function isCouponInValidWindow(coupon: Coupon, now: Date): boolean {
  return now >= coupon.validFrom && now <= coupon.validUntil;
}

export function isCouponWithinRedemptionLimit(coupon: Coupon): boolean {
  if (coupon.maxRedemptions === null) return true;
  return coupon.redemptionCount < coupon.maxRedemptions;
}

export function isCouponApplicableToEvent(coupon: Coupon, eventId: EntityId): boolean {
  return coupon.eventId === eventId;
}

export function validateCouponEligibility(
  coupon: Coupon,
  eventId: EntityId,
  now: Date,
): CouponEligibilityResult {
  if (!isCouponInValidWindow(coupon, now)) return { ok: false, reason: "out_of_window" };
  if (!isCouponWithinRedemptionLimit(coupon)) return { ok: false, reason: "redemption_limit_reached" };
  if (!isCouponApplicableToEvent(coupon, eventId)) return { ok: false, reason: "wrong_event" };
  return { ok: true };
}

export function applyCouponDiscount(coupon: Coupon, subtotalInCents: number): number {
  if (coupon.discountType === "fixed" && coupon.discountInCents !== null) {
    return Math.min(coupon.discountInCents, subtotalInCents);
  }
  if (coupon.discountType === "percentage" && coupon.discountPercentage !== null) {
    return Math.floor((subtotalInCents * coupon.discountPercentage) / 100);
  }
  return 0;
}
