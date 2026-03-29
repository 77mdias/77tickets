import { and, eq, sql } from "drizzle-orm";

import type { Db } from "../../infrastructure/db/client";
import { coupons } from "../../infrastructure/db/schema";
import type { EntityId } from "../common.repository.contracts";
import type {
  CouponRecord,
  CouponRepository,
} from "../coupon.repository.contracts";
import { mapPersistenceError } from "./map-persistence-error";

export class DrizzleCouponRepository implements CouponRepository {
  constructor(private readonly db: Db) {}

  async findById(couponId: EntityId): Promise<CouponRecord | null> {
    const [row] = await this.db
      .select()
      .from(coupons)
      .where(eq(coupons.id, couponId))
      .limit(1);

    return row ? toCouponRecord(row) : null;
  }

  async findByCodeForEvent(
    code: string,
    eventId: EntityId,
  ): Promise<CouponRecord | null> {
    const [row] = await this.db
      .select()
      .from(coupons)
      .where(and(eq(coupons.code, code), eq(coupons.eventId, eventId)))
      .limit(1);

    return row ? toCouponRecord(row) : null;
  }

  async create(coupon: Omit<CouponRecord, "id">): Promise<CouponRecord> {
    try {
      const [row] = await this.db
        .insert(coupons)
        .values({
          eventId: coupon.eventId,
          code: coupon.code,
          discountType: coupon.discountType,
          discountInCents: coupon.discountInCents,
          discountPercentage: coupon.discountPercentage,
          maxRedemptions: coupon.maxRedemptions,
          redemptionCount: coupon.redemptionCount,
          validFrom: coupon.validFrom,
          validUntil: coupon.validUntil,
        })
        .returning();

      return toCouponRecord(row);
    } catch (error) {
      throw mapPersistenceError(error, "create coupon");
    }
  }

  async update(coupon: CouponRecord): Promise<void> {
    try {
      await this.db
        .update(coupons)
        .set({
          eventId: coupon.eventId,
          code: coupon.code,
          discountType: coupon.discountType,
          discountInCents: coupon.discountInCents,
          discountPercentage: coupon.discountPercentage,
          maxRedemptions: coupon.maxRedemptions,
          redemptionCount: coupon.redemptionCount,
          validFrom: coupon.validFrom,
          validUntil: coupon.validUntil,
        })
        .where(eq(coupons.id, coupon.id));
    } catch (error) {
      throw mapPersistenceError(error, "update coupon");
    }
  }

  async incrementRedemptionCount(couponId: EntityId): Promise<void> {
    try {
      await this.db
        .update(coupons)
        .set({ redemptionCount: sql`${coupons.redemptionCount} + 1` })
        .where(eq(coupons.id, couponId));
    } catch (error) {
      throw mapPersistenceError(error, "increment coupon redemption count");
    }
  }
}

function toCouponRecord(row: typeof coupons.$inferSelect): CouponRecord {
  return {
    id: row.id,
    eventId: row.eventId,
    code: row.code,
    discountType: row.discountType,
    maxRedemptions: row.maxRedemptions,
    redemptionCount: row.redemptionCount,
    validFrom: row.validFrom,
    validUntil: row.validUntil,
    discountInCents: row.discountInCents,
    discountPercentage: row.discountPercentage,
  };
}
