import type { EntityId } from "../shared.types";

export type DiscountType = "fixed" | "percentage";

export interface Coupon {
  id: EntityId;
  eventId: EntityId;
  code: string;
  discountType: DiscountType;
  discountInCents: number | null;
  discountPercentage: number | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  validFrom: Date;
  validUntil: Date;
}
