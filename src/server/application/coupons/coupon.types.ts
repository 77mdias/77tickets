import type { DiscountType } from "../../domain/coupons";

export interface CouponGovernanceInputBase {
  code: string;
  discountType: DiscountType;
  discountInCents: number | null;
  discountPercentage: number | null;
  maxRedemptions: number;
  validFrom: Date;
  validUntil: Date;
}

export interface CreateCouponInput extends CouponGovernanceInputBase {
  eventId: string;
}

export interface UpdateCouponInput extends CouponGovernanceInputBase {
  couponId: string;
}

export interface CouponGovernanceResult {
  couponId: string;
  eventId: string;
  code: string;
  discountType: DiscountType;
  discountInCents: number | null;
  discountPercentage: number | null;
  maxRedemptions: number;
  redemptionCount: number;
  validFrom: Date;
  validUntil: Date;
}
