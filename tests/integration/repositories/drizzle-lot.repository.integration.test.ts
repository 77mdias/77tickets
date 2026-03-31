import { describe, expect, test } from "vitest";

import { DrizzleLotRepository } from "../../../src/server/repositories/drizzle/drizzle-lot.repository";
import { cleanDatabase, createTestDb } from "../setup";
import { createEventFixture, createLotFixture } from "../../fixtures";

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "DrizzleLotRepository",
  () => {
    const db = createTestDb();

    test("findById returns LotRecord for existing lot", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db);
      const lot = await createLotFixture(db, event.id, { title: "VIP" });

      const repo = new DrizzleLotRepository(db);
      const result = await repo.findById(lot.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(lot.id);
      expect(result!.eventId).toBe(event.id);
      expect(result!.title).toBe("VIP");
    });

    test("findById returns null for missing lot", async () => {
      await cleanDatabase(db);

      const repo = new DrizzleLotRepository(db);
      const result = await repo.findById("00000000-0000-0000-0000-000000000999");

      expect(result).toBeNull();
    });

    test("findByEventId returns all lots for the event", async () => {
      await cleanDatabase(db);

      const event1 = await createEventFixture(db, { slug: "event-lots-1" });
      const event2 = await createEventFixture(db, { slug: "event-lots-2" });

      await createLotFixture(db, event1.id, { title: "Lot A" });
      await createLotFixture(db, event1.id, { title: "Lot B" });
      await createLotFixture(db, event2.id, { title: "Lot C" });

      const repo = new DrizzleLotRepository(db);
      const results = await repo.findByEventId(event1.id);

      expect(results).toHaveLength(2);
      expect(results.every((l) => l.eventId === event1.id)).toBe(true);
    });

    test("findByEventId returns empty array when no lots exist for event", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db);

      const repo = new DrizzleLotRepository(db);
      const results = await repo.findByEventId(event.id);

      expect(results).toHaveLength(0);
    });

    test("save inserts a new lot", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db);
      const repo = new DrizzleLotRepository(db);
      const lotRecord = {
        id: "00000000-0000-0000-0000-000000000200",
        eventId: event.id,
        title: "VIP",
        priceInCents: 25000,
        totalQuantity: 20,
        availableQuantity: 20,
        maxPerOrder: 2,
        saleStartsAt: new Date("2027-07-01T10:00:00Z"),
        saleEndsAt: new Date("2027-07-02T10:00:00Z"),
        status: "active" as const,
      };

      await repo.save(lotRecord);

      const saved = await repo.findById(lotRecord.id);
      expect(saved).not.toBeNull();
      expect(saved).toMatchObject(lotRecord);
    });

    test("save updates an existing lot", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db);
      const existing = await createLotFixture(db, event.id, {
        id: "00000000-0000-0000-0000-000000000201",
        title: "Original",
        priceInCents: 10000,
        totalQuantity: 100,
        availableQuantity: 100,
        maxPerOrder: 4,
        saleStartsAt: new Date("2027-07-01T10:00:00Z"),
        saleEndsAt: new Date("2027-07-02T10:00:00Z"),
        status: "active",
      });

      const repo = new DrizzleLotRepository(db);
      await repo.save({
        ...existing,
        title: "Updated",
        priceInCents: 15000,
        totalQuantity: 80,
        availableQuantity: 75,
        maxPerOrder: 3,
        saleStartsAt: new Date("2027-08-01T10:00:00Z"),
        saleEndsAt: null,
        status: "paused",
      });

      const saved = await repo.findById(existing.id);
      expect(saved).not.toBeNull();
      expect(saved).toMatchObject({
        id: existing.id,
        eventId: event.id,
        title: "Updated",
        priceInCents: 15000,
        totalQuantity: 80,
        availableQuantity: 75,
        maxPerOrder: 3,
        saleStartsAt: new Date("2027-08-01T10:00:00Z"),
        saleEndsAt: null,
        status: "paused",
      });
    });

    test("decrementAvailableQuantity reduces availableQuantity by the given amount", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db);
      const lot = await createLotFixture(db, event.id, { availableQuantity: 50 });

      const repo = new DrizzleLotRepository(db);
      await repo.decrementAvailableQuantity(lot.id, 3);

      const updated = await repo.findById(lot.id);
      expect(updated!.availableQuantity).toBe(47);
    });

    test("decrementAvailableQuantity is idempotent across multiple calls", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db);
      const lot = await createLotFixture(db, event.id, { availableQuantity: 100 });

      const repo = new DrizzleLotRepository(db);
      await repo.decrementAvailableQuantity(lot.id, 10);
      await repo.decrementAvailableQuantity(lot.id, 5);

      const updated = await repo.findById(lot.id);
      expect(updated!.availableQuantity).toBe(85);
    });
  },
);
