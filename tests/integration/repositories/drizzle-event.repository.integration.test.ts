import { describe, expect, test } from "vitest";

import { DrizzleEventRepository } from "../../../src/server/repositories/drizzle/drizzle-event.repository";
import { cleanDatabase, createTestDb } from "../setup";
import { createEventFixture } from "../../fixtures";

const encodeCursor = (startsAt: Date, id: string): string =>
  Buffer.from(
    JSON.stringify({
      startsAt: startsAt.toISOString(),
      id,
    }),
    "utf8",
  ).toString("base64url");

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

    test("findBySlug returns event regardless of lifecycle status", async () => {
      await cleanDatabase(db);

      const draft = await createEventFixture(db, { slug: "any-status-event", status: "draft" });

      const repo = new DrizzleEventRepository(db);
      const result = await repo.findBySlug("any-status-event");

      expect(result).not.toBeNull();
      expect(result!.id).toBe(draft.id);
      expect(result!.status).toBe("draft");
    });

    test("listPublished returns only published events that are upcoming or in progress", async () => {
      await cleanDatabase(db);

      await createEventFixture(db, {
        slug: "pub-upcoming",
        status: "published",
        startsAt: new Date("2099-06-01T10:00:00.000Z"),
        endsAt: new Date("2099-06-01T20:00:00.000Z"),
      });
      await createEventFixture(db, {
        slug: "pub-ended",
        status: "published",
        startsAt: new Date("2020-06-01T10:00:00.000Z"),
        endsAt: new Date("2020-06-01T20:00:00.000Z"),
      });
      await createEventFixture(db, {
        slug: "draft-upcoming",
        status: "draft",
        startsAt: new Date("2099-08-01T10:00:00.000Z"),
        endsAt: new Date("2099-08-01T20:00:00.000Z"),
      });

      const repo = new DrizzleEventRepository(db);
      const results = await repo.listPublished();

      expect(results.items.map((event) => event.slug)).toEqual(["pub-upcoming"]);
      expect(results.items.every((event) => event.status === "published")).toBe(true);
      expect(results.hasMore).toBe(false);
    });

    test("listPublished supports filters plus cursor and legacy pagination in startsAt/id order", async () => {
      await cleanDatabase(db);

      await createEventFixture(db, {
        id: "00000000-0000-0000-0000-000000000201",
        slug: "pub-page-1",
        title: "Festival Rock",
        location: "Sao Paulo",
        category: "concerts",
        status: "published",
        startsAt: new Date("2099-06-01T10:00:00.000Z"),
        endsAt: new Date("2099-06-01T20:00:00.000Z"),
      });
      await createEventFixture(db, {
        id: "00000000-0000-0000-0000-000000000202",
        slug: "pub-page-2",
        title: "Festival Tech",
        location: "Sao Paulo",
        category: "concerts",
        status: "published",
        startsAt: new Date("2099-07-01T10:00:00.000Z"),
        endsAt: new Date("2099-07-01T20:00:00.000Z"),
      });
      await createEventFixture(db, {
        id: "00000000-0000-0000-0000-000000000203",
        slug: "pub-page-3",
        title: "Festival Lights",
        location: "Sao Paulo",
        category: "concerts",
        status: "published",
        startsAt: new Date("2099-07-01T10:00:00.000Z"),
        endsAt: new Date("2099-08-01T20:00:00.000Z"),
      });
      await createEventFixture(db, {
        slug: "pub-other-location",
        title: "Festival Recife",
        location: "Recife",
        category: "concerts",
        status: "published",
        startsAt: new Date("2099-07-01T11:00:00.000Z"),
        endsAt: new Date("2099-07-01T21:00:00.000Z"),
      });
      await createEventFixture(db, {
        slug: "pub-other-category",
        title: "Festival Theater",
        location: "Sao Paulo",
        category: "theater",
        status: "published",
        startsAt: new Date("2099-07-02T10:00:00.000Z"),
        endsAt: new Date("2099-07-02T20:00:00.000Z"),
      });

      const repo = new DrizzleEventRepository(db);
      const firstPage = await repo.listPublished({
        q: "festival",
        date: "2099-07-01",
        location: "Sao Paulo",
        category: "concerts",
        page: 1,
        limit: 2,
      });

      expect(firstPage.items.map((event) => event.slug)).toEqual([
        "pub-page-2",
        "pub-page-3",
      ]);
      expect(firstPage.hasMore).toBe(false);

      const legacyPage = await repo.listPublished({ page: 2, limit: 1 });

      expect(legacyPage.items).toHaveLength(1);
      expect(legacyPage.items[0].slug).toBe("pub-page-2");

      const cursorPage = await repo.listPublished({
        limit: 1,
        cursor: encodeCursor(
          new Date("2099-07-01T10:00:00.000Z"),
          "00000000-0000-0000-0000-000000000202",
        ),
      });

      expect(cursorPage.items.map((event) => event.slug)).toEqual(["pub-page-3"]);
      expect(cursorPage.hasMore).toBe(true);
    });

    test("listStartingBetween returns published events in the provided window", async () => {
      await cleanDatabase(db);

      await createEventFixture(db, {
        slug: "window-in",
        status: "published",
        startsAt: new Date("2026-04-03T12:15:00.000Z"),
        endsAt: new Date("2026-04-03T14:00:00.000Z"),
      });
      await createEventFixture(db, {
        slug: "window-out-before",
        status: "published",
        startsAt: new Date("2026-04-03T10:00:00.000Z"),
        endsAt: new Date("2026-04-03T11:00:00.000Z"),
      });
      await createEventFixture(db, {
        slug: "window-out-after",
        status: "published",
        startsAt: new Date("2026-04-03T16:00:00.000Z"),
        endsAt: new Date("2026-04-03T18:00:00.000Z"),
      });
      await createEventFixture(db, {
        slug: "window-draft",
        status: "draft",
        startsAt: new Date("2026-04-03T12:30:00.000Z"),
        endsAt: new Date("2026-04-03T13:30:00.000Z"),
      });

      const repo = new DrizzleEventRepository(db);
      const results = await repo.listStartingBetween(
        new Date("2026-04-03T11:00:00.000Z"),
        new Date("2026-04-03T13:00:00.000Z"),
      );

      expect(results.map((event) => event.slug)).toEqual(["window-in"]);
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
