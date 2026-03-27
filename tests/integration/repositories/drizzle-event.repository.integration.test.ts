import { describe, expect, test } from "vitest";

import { DrizzleEventRepository } from "../../../src/server/repositories/drizzle/drizzle-event.repository";
import { cleanDatabase, createTestDb } from "../setup";
import { createEventFixture } from "../../fixtures";

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "DrizzleEventRepository",
  () => {
    const db = createTestDb();

    test("findById returns EventRecord for existing event", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, {
        slug: "find-by-id-event",
        title: "Find By Id Event",
        status: "published",
      });

      const repo = new DrizzleEventRepository(db);
      const result = await repo.findById(event.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(event.id);
      expect(result!.slug).toBe("find-by-id-event");
      expect(result!.title).toBe("Find By Id Event");
      expect(result!.status).toBe("published");
    });

    test("findById returns null for missing event", async () => {
      await cleanDatabase(db);

      const repo = new DrizzleEventRepository(db);
      const result = await repo.findById("00000000-0000-0000-0000-000000000999");

      expect(result).toBeNull();
    });

    test("findPublishedBySlug returns published event", async () => {
      await cleanDatabase(db);

      await createEventFixture(db, { slug: "pub-event", status: "published" });

      const repo = new DrizzleEventRepository(db);
      const result = await repo.findPublishedBySlug("pub-event");

      expect(result).not.toBeNull();
      expect(result!.slug).toBe("pub-event");
      expect(result!.status).toBe("published");
    });

    test("findPublishedBySlug returns null for draft event", async () => {
      await cleanDatabase(db);

      await createEventFixture(db, { slug: "draft-event", status: "draft" });

      const repo = new DrizzleEventRepository(db);
      const result = await repo.findPublishedBySlug("draft-event");

      expect(result).toBeNull();
    });

    test("listByOrganizer returns all events for the organizer", async () => {
      await cleanDatabase(db);

      const organizer1 = "00000000-0000-0000-0000-000000000011";
      const organizer2 = "00000000-0000-0000-0000-000000000022";

      await createEventFixture(db, { organizerId: organizer1, slug: "org1-event-a" });
      await createEventFixture(db, { organizerId: organizer1, slug: "org1-event-b" });
      await createEventFixture(db, { organizerId: organizer2, slug: "org2-event-a" });

      const repo = new DrizzleEventRepository(db);
      const results = await repo.listByOrganizer(organizer1);

      expect(results).toHaveLength(2);
      expect(results.every((e) => e.organizerId === organizer1)).toBe(true);
    });

    test("save inserts a new event", async () => {
      await cleanDatabase(db);

      const repo = new DrizzleEventRepository(db);

      const eventRecord = {
        id: "00000000-0000-0000-0000-000000000100",
        organizerId: "00000000-0000-0000-0000-000000000001",
        slug: "saved-event",
        title: "Saved Event",
        status: "draft" as const,
        startsAt: new Date("2027-07-01T10:00:00Z"),
        endsAt: null,
      };

      await repo.save(eventRecord);

      const found = await repo.findById(eventRecord.id);
      expect(found).not.toBeNull();
      expect(found!.slug).toBe("saved-event");
    });

    test("save updates existing event (upsert)", async () => {
      await cleanDatabase(db);

      const repo = new DrizzleEventRepository(db);

      const eventRecord = {
        id: "00000000-0000-0000-0000-000000000101",
        organizerId: "00000000-0000-0000-0000-000000000001",
        slug: "upsert-event",
        title: "Original Title",
        status: "draft" as const,
        startsAt: new Date("2027-07-01T10:00:00Z"),
        endsAt: null,
      };

      await repo.save(eventRecord);
      await repo.save({ ...eventRecord, title: "Updated Title", status: "published" });

      const found = await repo.findById(eventRecord.id);
      expect(found!.title).toBe("Updated Title");
      expect(found!.status).toBe("published");
    });

    test("save maps duplicate slug constraint to PersistenceError", async () => {
      await cleanDatabase(db);

      await createEventFixture(db, {
        slug: "duplicate-event-slug",
        title: "Existing Event",
      });

      const repo = new DrizzleEventRepository(db);

      const duplicateRecord = {
        id: "00000000-0000-0000-0000-000000000102",
        organizerId: "00000000-0000-0000-0000-000000000001",
        slug: "duplicate-event-slug",
        title: "Conflicting Event",
        status: "draft" as const,
        startsAt: new Date("2027-07-02T10:00:00Z"),
        endsAt: null,
      };

      await expect(repo.save(duplicateRecord)).rejects.toMatchObject({
        name: "PersistenceError",
        kind: "unique-constraint",
        constraint: "events_slug_unique",
      });
    });
  },
);
