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

    test("findById returns CouponRecord for existing coupon id", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, { status: "published" });
      const fixture = await createCouponFixture(db, event.id, { code: "BY-ID" });

      const repo = new DrizzleCouponRepository(db);
      const result = await repo.findById(fixture.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(fixture.id);
      expect(result!.eventId).toBe(event.id);
      expect(result!.code).toBe("BY-ID");
    });

    test("create persists coupon and returns record", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, { status: "published" });
      const repo = new DrizzleCouponRepository(db);

      const created = await repo.create({
        eventId: event.id,
        code: "CREATE10",
        discountType: "percentage",
        discountInCents: null,
        discountPercentage: 10,
        maxRedemptions: 100,
        redemptionCount: 0,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validUntil: new Date("2026-12-31T23:59:59.000Z"),
      });

      expect(created.id).toBeDefined();
      expect(created.eventId).toBe(event.id);
      expect(created.code).toBe("CREATE10");
      expect(created.discountPercentage).toBe(10);
    });

    test("update persists coupon changes", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, { status: "published" });
      const fixture = await createCouponFixture(db, event.id, {
        code: "UPD10",
        discountPercentage: 10,
        maxRedemptions: 100,
      });

      const repo = new DrizzleCouponRepository(db);

      await repo.update({
        id: fixture.id,
        eventId: event.id,
        code: "UPD20",
        discountType: "percentage",
        discountInCents: null,
        discountPercentage: 20,
        maxRedemptions: 200,
        redemptionCount: fixture.redemptionCount,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validUntil: new Date("2026-12-31T23:59:59.000Z"),
      });

      const updated = await repo.findById(fixture.id);
      expect(updated).not.toBeNull();
      expect(updated!.code).toBe("UPD20");
      expect(updated!.discountPercentage).toBe(20);
      expect(updated!.maxRedemptions).toBe(200);
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
