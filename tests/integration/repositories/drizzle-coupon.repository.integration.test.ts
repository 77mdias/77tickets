import { describe, expect, test } from "vitest";

import { DrizzleCouponRepository } from "../../../src/server/repositories/drizzle/drizzle-coupon.repository";
import { cleanDatabase, createTestDb } from "../setup";
import { createCouponFixture, createEventFixture } from "../../fixtures";

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "DrizzleCouponRepository",
  () => {
    const db = createTestDb();

    test("findByCodeForEvent returns CouponRecord for matching code and event", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, { status: "published" });
      await createCouponFixture(db, event.id, { code: "SAVE20" });

      const repo = new DrizzleCouponRepository(db);
      const result = await repo.findByCodeForEvent("SAVE20", event.id);

      expect(result).not.toBeNull();
      expect(result!.code).toBe("SAVE20");
      expect(result!.eventId).toBe(event.id);
    });

    test("findByCodeForEvent returns null for unknown code", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db);

      const repo = new DrizzleCouponRepository(db);
      const result = await repo.findByCodeForEvent("GHOST", event.id);

      expect(result).toBeNull();
    });

    test("findByCodeForEvent returns null when code exists on a different event", async () => {
      await cleanDatabase(db);

      const event1 = await createEventFixture(db, { slug: "event-coupon-1" });
      const event2 = await createEventFixture(db, { slug: "event-coupon-2" });
      await createCouponFixture(db, event1.id, { code: "ONLY-FOR-EVENT1" });

      const repo = new DrizzleCouponRepository(db);
      const result = await repo.findByCodeForEvent("ONLY-FOR-EVENT1", event2.id);

      expect(result).toBeNull();
    });

    test("incrementRedemptionCount atomically increments redemptionCount by 1", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, { status: "published" });
      await createCouponFixture(db, event.id, { code: "INCREMENT10", redemptionCount: 5 });

      const repo = new DrizzleCouponRepository(db);
      const coupon = await repo.findByCodeForEvent("INCREMENT10", event.id);

      await repo.incrementRedemptionCount(coupon!.id);

      const updated = await repo.findByCodeForEvent("INCREMENT10", event.id);
      expect(updated!.redemptionCount).toBe(6);
    });

    test("incrementRedemptionCount called multiple times increments correctly", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, { status: "published" });
      await createCouponFixture(db, event.id, { code: "MULTI-INC", redemptionCount: 0 });

      const repo = new DrizzleCouponRepository(db);
      const coupon = await repo.findByCodeForEvent("MULTI-INC", event.id);

      await repo.incrementRedemptionCount(coupon!.id);
      await repo.incrementRedemptionCount(coupon!.id);
      await repo.incrementRedemptionCount(coupon!.id);

      const updated = await repo.findByCodeForEvent("MULTI-INC", event.id);
      expect(updated!.redemptionCount).toBe(3);
    });
  },
);
