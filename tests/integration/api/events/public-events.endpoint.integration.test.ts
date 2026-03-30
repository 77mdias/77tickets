import { describe, expect, test } from "vitest";

import { createGetEventHandler } from "../../../../src/server/api/events/get-event.handler";
import { createListEventsHandler } from "../../../../src/server/api/events/list-events.handler";
import {
  createGetEventDetailUseCase,
  createListPublishedEventsUseCase,
} from "../../../../src/server/application/use-cases";
import { DrizzleEventRepository, DrizzleLotRepository } from "../../../../src/server/repositories/drizzle";
import { createEventFixture, createLotFixture } from "../../../fixtures";
import { cleanDatabase, createTestDb } from "../../setup";

describe.skipIf(!process.env.TEST_DATABASE_URL)("public events endpoint integration", () => {
  const db = createTestDb();
  const eventRepository = new DrizzleEventRepository(db);
  const lotRepository = new DrizzleLotRepository(db);

  const createListHandler = () =>
    createListEventsHandler({
      listPublishedEvents: createListPublishedEventsUseCase({
        eventRepository,
      }),
    });

  const createGetHandler = () =>
    createGetEventHandler({
      getEventDetail: createGetEventDetailUseCase({
        now: () => new Date("2026-05-10T12:00:00.000Z"),
        eventRepository,
        lotRepository,
      }),
    });

  test("GET /api/events returns only published upcoming events with pagination", async () => {
    await cleanDatabase(db);

    await createEventFixture(db, {
      slug: "pub-list-1",
      status: "published",
      startsAt: new Date("2099-05-10T18:00:00.000Z"),
      endsAt: new Date("2099-05-10T22:00:00.000Z"),
    });
    await createEventFixture(db, {
      slug: "pub-list-2",
      status: "published",
      startsAt: new Date("2099-06-10T18:00:00.000Z"),
      endsAt: new Date("2099-06-10T22:00:00.000Z"),
    });
    await createEventFixture(db, {
      slug: "draft-list-1",
      status: "draft",
      startsAt: new Date("2099-07-10T18:00:00.000Z"),
      endsAt: new Date("2099-07-10T22:00:00.000Z"),
    });

    const handler = createListHandler();
    const response = await handler({ query: { page: "1", limit: "1" } });

    expect(response.status).toBe(200);
    if (response.status !== 200) return;

    expect(response.body.data.page).toBe(1);
    expect(response.body.data.limit).toBe(1);
    expect(response.body.data.events).toHaveLength(1);
    expect(response.body.data.events[0].slug).toBe("pub-list-1");
  });

  test("GET /api/events/:slug returns event detail with lot availability projection", async () => {
    await cleanDatabase(db);

    const event = await createEventFixture(db, {
      slug: "evento-detalhe",
      status: "published",
      startsAt: new Date("2099-08-10T18:00:00.000Z"),
      endsAt: new Date("2099-08-10T22:00:00.000Z"),
    });

    await createLotFixture(db, event.id, {
      title: "Lote Ativo",
      status: "active",
      availableQuantity: 12,
      saleStartsAt: new Date("2026-01-01T00:00:00.000Z"),
      saleEndsAt: new Date("2026-12-31T23:59:59.000Z"),
    });
    await createLotFixture(db, event.id, {
      title: "Lote Fora Janela",
      status: "active",
      availableQuantity: 7,
      saleStartsAt: new Date("2025-01-01T00:00:00.000Z"),
      saleEndsAt: new Date("2025-12-31T23:59:59.000Z"),
    });

    const handler = createGetHandler();
    const response = await handler({ params: { slug: "evento-detalhe" } });

    expect(response.status).toBe(200);
    if (response.status !== 200) return;

    expect(response.body.data.event.slug).toBe("evento-detalhe");
    expect(response.body.data.lots.map((lot) => lot.available)).toEqual([12, 0]);
  });

  test("GET /api/events/:slug returns 404 for non-published slug", async () => {
    await cleanDatabase(db);

    await createEventFixture(db, {
      slug: "evento-draft",
      status: "draft",
    });

    const handler = createGetHandler();
    const response = await handler({ params: { slug: "evento-draft" } });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("not-found");
  });
});
