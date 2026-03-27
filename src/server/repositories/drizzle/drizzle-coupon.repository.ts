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
    maxRedemptions: row.maxRedemptions,
    redemptionCount: row.redemptionCount,
    validFrom: row.validFrom,
    validUntil: row.validUntil,
    discountInCents: row.discountInCents,
    discountPercentage: row.discountPercentage,
  };
}
