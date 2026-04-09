import type { EntityId } from "./common.repository.contracts";
import type { DiscountType } from "../domain/coupons";

export interface CouponRecord {
  id: EntityId;
  eventId: EntityId;
  code: string;
  discountType: DiscountType;
  maxRedemptions: number | null;
  redemptionCount: number;
  validFrom: Date;
  validUntil: Date;
  discountInCents: number | null;
  discountPercentage: number | null;
}

export interface CouponRepository {
  findById(couponId: EntityId): Promise<CouponRecord | null>;
  findByCodeForEvent(code: string, eventId: EntityId): Promise<CouponRecord | null>;
  create(coupon: Omit<CouponRecord, "id">): Promise<CouponRecord>;
  update(coupon: CouponRecord): Promise<void>;
  incrementRedemptionCount(couponId: EntityId): Promise<void>;
}
