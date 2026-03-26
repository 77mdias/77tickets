import type { EntityId } from "./common.repository.contracts";

export interface CouponRecord {
  id: EntityId;
  eventId: EntityId;
  code: string;
  maxRedemptions: number | null;
  redemptionCount: number;
  validFrom: Date;
  validUntil: Date;
  discountInCents: number | null;
  discountPercentage: number | null;
}

export interface CouponRepository {
  findByCodeForEvent(code: string, eventId: EntityId): Promise<CouponRecord | null>;
  incrementRedemptionCount(couponId: EntityId): Promise<void>;
}
