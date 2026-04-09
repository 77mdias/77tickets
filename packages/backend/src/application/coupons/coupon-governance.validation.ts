import { createConflictError } from "../errors";
import type { CouponGovernanceInputBase } from "./coupon.types";

const createCouponGovernanceConflictError = (reason: string) =>
  createConflictError("Coupon governance conflict", { details: { reason } });

export const normalizeCouponCode = (code: string): string => code.trim().toUpperCase();

export const validateCouponGovernanceInput = (input: CouponGovernanceInputBase): void => {
  if (input.maxRedemptions <= 0) {
    throw createCouponGovernanceConflictError("invalid_max_redemptions");
  }

  if (input.validFrom > input.validUntil) {
    throw createCouponGovernanceConflictError("invalid_coupon_window");
  }

  const isFixedCouponValid =
    input.discountType === "fixed" &&
    input.discountInCents !== null &&
    input.discountInCents > 0 &&
    input.discountPercentage === null;

  const isPercentageCouponValid =
    input.discountType === "percentage" &&
    input.discountPercentage !== null &&
    input.discountPercentage >= 1 &&
    input.discountPercentage <= 100 &&
    input.discountInCents === null;

  if (!isFixedCouponValid && !isPercentageCouponValid) {
    throw createCouponGovernanceConflictError("invalid_coupon_discount");
  }
};

export const assertCouponCodeIsUniqueForEvent = (
  hasDuplicate: boolean,
): void => {
  if (hasDuplicate) {
    throw createCouponGovernanceConflictError("coupon_code_already_exists");
  }
};
