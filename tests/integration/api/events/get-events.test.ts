import { describe, expect, test } from "vitest";

import { createListEventsHandler } from "../../../../src/server/api/events/list-events.handler";
import { createListPublishedEventsUseCase } from "../../../../src/server/application/use-cases";
import { DrizzleEventRepository } from "../../../../src/server/repositories/drizzle";
import { createEventFixture } from "../../../fixtures";
import { cleanDatabase, createTestDb } from "../../setup";

const decodeCursor = (cursor: string): { startsAt: string; id: string } =>
  JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));

type DiscoveryEventsResult = {
  page?: number;
  limit?: number;
  nextCursor?: string | null;
  events: Array<{
    id: string;
    slug: string;
    title: string;
    startsAt: Date;
    imageUrl: string | null;
    location: string | null;
  }>;
};

const EVENT_IDS = {
  festivalRock: "00000000-0000-0000-0000-000000000101",
  festivalTech: "00000000-0000-0000-0000-000000000102",
  corrida: "00000000-0000-0000-0000-000000000103",
} as const;

describe.skipIf(!process.env.TEST_DATABASE_URL)("GET /api/events discovery upgrades", () => {
  const db = createTestDb();

  const createHandler = () =>
    createListEventsHandler({
      listPublishedEvents: createListPublishedEventsUseCase({
        eventRepository: new DrizzleEventRepository(db),
      }),
    });

  const seedDiscoveryEvents = async () => {
    const festivalRock = await createEventFixture(db, {
      id: EVENT_IDS.festivalRock,
      slug: "festival-rock",
      title: "Festival Rock",
      location: "Sao Paulo",
      category: "concerts",
      status: "published",
      startsAt: new Date("2099-05-01T18:00:00.000Z"),
      endsAt: new Date("2099-05-01T22:00:00.000Z"),
    });
    const festivalTech = await createEventFixture(db, {
      id: EVENT_IDS.festivalTech,
      slug: "festival-tech",
      title: "Festival Tech",
      location: "Recife",
      category: "shows",
      status: "published",
      startsAt: new Date("2099-06-01T18:00:00.000Z"),
      endsAt: new Date("2099-06-01T22:00:00.000Z"),
    });
    const corrida = await createEventFixture(db, {
      id: EVENT_IDS.corrida,
      slug: "corrida",
      title: "Corrida de Rua",
      location: "Fortaleza",
      category: "sports",
      status: "published",
      startsAt: new Date("2099-07-01T08:00:00.000Z"),
      endsAt: new Date("2099-07-01T10:00:00.000Z"),
    });

    return { festivalRock, festivalTech, corrida };
  };

  test("filters by q on the public discovery feed", async () => {
    await cleanDatabase(db);
    await seedDiscoveryEvents();

    const handler = createHandler();
    const response = await handler({ query: { q: "festival" } });

    expect(response.status).toBe(200);
    if (response.status !== 200) return;

    const data = response.body.data as DiscoveryEventsResult;
    expect(data.events.map((event) => event.slug)).toEqual([
      "festival-rock",
      "festival-tech",
    ]);
  });

  test("filters by location on the public discovery feed", async () => {
    await cleanDatabase(db);
    await seedDiscoveryEvents();

    const handler = createHandler();
    const response = await handler({ query: { location: "Recife" } });

    expect(response.status).toBe(200);
    if (response.status !== 200) return;

    const data = response.body.data as DiscoveryEventsResult;
    expect(data.events.map((event) => event.slug)).toEqual(["festival-tech"]);
  });

  test("filters by category on the public discovery feed", async () => {
    await cleanDatabase(db);
    await seedDiscoveryEvents();

    const handler = createHandler();
    const response = await handler({ query: { category: "shows" } });

    expect(response.status).toBe(200);
    if (response.status !== 200) return;

    const data = response.body.data as DiscoveryEventsResult;
    expect(data.events.map((event) => event.slug)).toEqual(["festival-tech"]);
  });

  test("filters by date on the public discovery feed", async () => {
    await cleanDatabase(db);
    await seedDiscoveryEvents();

    const handler = createHandler();
    const response = await handler({ query: { date: "2099-07-01" } });

    expect(response.status).toBe(200);
    if (response.status !== 200) return;

    const data = response.body.data as DiscoveryEventsResult;
    expect(data.events.map((event) => event.slug)).toEqual(["corrida"]);
  });

  test("combines q, category, and date filters in one request", async () => {
    await cleanDatabase(db);
    await seedDiscoveryEvents();

    const handler = createHandler();
    const response = await handler({
      query: {
        q: "festival",
        category: "shows",
        date: "2099-06-01",
      },
    });

    expect(response.status).toBe(200);
    if (response.status !== 200) return;

    const data = response.body.data as DiscoveryEventsResult;
    expect(data.events.map((event) => event.slug)).toEqual(["festival-tech"]);
  });

  test("returns a nextCursor on the first cursor page", async () => {
    await cleanDatabase(db);
    const { festivalRock, festivalTech, corrida } = await seedDiscoveryEvents();

    const handler = createHandler();
    const response = await handler({ query: { limit: "2" } });

    expect(response.status).toBe(200);
    if (response.status !== 200) return;

    const data = response.body.data as DiscoveryEventsResult;
    expect(data.events.map((event) => event.slug)).toEqual([
      festivalRock.slug,
      festivalTech.slug,
    ]);
    expect(data.nextCursor).toEqual(expect.any(String));
    expect(decodeCursor(data.nextCursor!)).toEqual({
      startsAt: festivalTech.startsAt.toISOString(),
      id: festivalTech.id,
    });
    expect(data.events.find((event) => event.slug === corrida.slug)).toBeUndefined();
  });

  test("returns null nextCursor on the last cursor page", async () => {
    await cleanDatabase(db);
    const { corrida } = await seedDiscoveryEvents();

    const handler = createHandler();
    const firstResponse = await handler({ query: { limit: "2" } });

    expect(firstResponse.status).toBe(200);
    if (firstResponse.status !== 200) return;

    const firstPage = firstResponse.body.data as DiscoveryEventsResult;
    const response = await handler({ query: { limit: "2", cursor: firstPage.nextCursor! } });

    expect(response.status).toBe(200);
    if (response.status !== 200) return;

    const data = response.body.data as DiscoveryEventsResult;
    expect(data.events.map((event) => event.slug)).toEqual([corrida.slug]);
    expect(data.nextCursor).toBeNull();
  });

  test("rejects an invalid date query with a 400 validation error", async () => {
    await cleanDatabase(db);
    await seedDiscoveryEvents();

    const handler = createHandler();
    const response = await handler({ query: { date: "not-a-date" } });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("validation");
    expect(response.body.error.message).toBe("Invalid request payload");
    expect(response.body.error.details).toMatchObject({
      issues: expect.arrayContaining([
        expect.objectContaining({
          path: "date",
        }),
      ]),
    });
  });

  test("keeps legacy page and limit pagination functional", async () => {
    await cleanDatabase(db);
    await seedDiscoveryEvents();

    const handler = createHandler();
    const response = await handler({ query: { page: "2", limit: "1" } });

    expect(response.status).toBe(200);
    if (response.status !== 200) return;

    const data = response.body.data as DiscoveryEventsResult;
    expect(data.page).toBe(2);
    expect(data.limit).toBe(1);
    expect(data.events.map((event) => event.slug)).toEqual(["festival-tech"]);
    expect(data.nextCursor).toEqual(expect.any(String));
  });
});
