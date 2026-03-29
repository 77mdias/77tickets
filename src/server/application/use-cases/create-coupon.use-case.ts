import type { CouponGovernanceResult, CreateCouponInput } from "../coupons";
import type { CouponRepository } from "../../repositories";
import {
  assertCouponCodeIsUniqueForEvent,
  normalizeCouponCode,
  validateCouponGovernanceInput,
} from "../coupons/coupon-governance.validation";

export type CreateCouponUseCase = (
  input: CreateCouponInput,
) => Promise<CouponGovernanceResult>;

export interface CreateCouponUseCaseDependencies {
  couponRepository: Pick<CouponRepository, "findByCodeForEvent" | "create">;
}

export const createCreateCouponUseCase = (
  dependencies: CreateCouponUseCaseDependencies,
): CreateCouponUseCase => {
  return async (input) => {
    validateCouponGovernanceInput(input);

    const normalizedCode = normalizeCouponCode(input.code);
    const existingCoupon = await dependencies.couponRepository.findByCodeForEvent(
      normalizedCode,
      input.eventId,
    );

    assertCouponCodeIsUniqueForEvent(existingCoupon !== null);

    const created = await dependencies.couponRepository.create({
      eventId: input.eventId,
      code: normalizedCode,
      discountType: input.discountType,
      discountInCents: input.discountInCents,
      discountPercentage: input.discountPercentage,
      maxRedemptions: input.maxRedemptions,
      redemptionCount: 0,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
    });

    return {
      couponId: created.id,
      eventId: created.eventId,
      code: created.code,
      discountType: created.discountType,
      discountInCents: created.discountInCents,
      discountPercentage: created.discountPercentage,
      maxRedemptions: created.maxRedemptions,
      redemptionCount: created.redemptionCount,
      validFrom: created.validFrom,
      validUntil: created.validUntil,
    };
  };
};
