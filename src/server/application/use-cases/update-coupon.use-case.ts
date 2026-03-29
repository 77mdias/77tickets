import type { CouponGovernanceResult, UpdateCouponInput } from "../coupons";
import {
  createNotFoundError,
} from "../errors";
import type { CouponRepository } from "../../repositories";
import {
  assertCouponCodeIsUniqueForEvent,
  normalizeCouponCode,
  validateCouponGovernanceInput,
} from "../coupons/coupon-governance.validation";

export type UpdateCouponUseCase = (
  input: UpdateCouponInput,
) => Promise<CouponGovernanceResult>;

export interface UpdateCouponUseCaseDependencies {
  couponRepository: Pick<
    CouponRepository,
    "findById" | "findByCodeForEvent" | "update"
  >;
}

export const createUpdateCouponUseCase = (
  dependencies: UpdateCouponUseCaseDependencies,
): UpdateCouponUseCase => {
  return async (input) => {
    const existingCoupon = await dependencies.couponRepository.findById(
      input.couponId,
    );

    if (!existingCoupon) {
      throw createNotFoundError("Coupon not found");
    }

    validateCouponGovernanceInput(input);

    const normalizedCode = normalizeCouponCode(input.code);
    const couponWithSameCode = await dependencies.couponRepository.findByCodeForEvent(
      normalizedCode,
      existingCoupon.eventId,
    );

    assertCouponCodeIsUniqueForEvent(
      couponWithSameCode !== null && couponWithSameCode.id !== existingCoupon.id,
    );

    const updatedCoupon = {
      ...existingCoupon,
      code: normalizedCode,
      discountType: input.discountType,
      discountInCents: input.discountInCents,
      discountPercentage: input.discountPercentage,
      maxRedemptions: input.maxRedemptions,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
    };

    await dependencies.couponRepository.update(updatedCoupon);

    return {
      couponId: updatedCoupon.id,
      eventId: updatedCoupon.eventId,
      code: updatedCoupon.code,
      discountType: updatedCoupon.discountType,
      discountInCents: updatedCoupon.discountInCents,
      discountPercentage: updatedCoupon.discountPercentage,
      maxRedemptions: updatedCoupon.maxRedemptions,
      redemptionCount: updatedCoupon.redemptionCount,
      validFrom: updatedCoupon.validFrom,
      validUntil: updatedCoupon.validUntil,
    };
  };
};
