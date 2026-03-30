import { expect, test, vi } from "vitest";

import { createNotFoundError } from "../../../../../src/server/application/errors";
import { createGetEventHandler } from "../../../../../src/server/api/events/get-event.handler";

test("EVT-007 RED: returns event detail for valid slug", async () => {
  const getEventDetail = vi.fn(async () => ({
    event: {
      id: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
      slug: "evento-publico",
      title: "Evento Publico",
      description: "Descricao",
      location: "Sao Paulo",
      imageUrl: null,
      startsAt: new Date("2099-05-10T18:00:00.000Z"),
      endsAt: new Date("2099-05-10T22:00:00.000Z"),
    },
    lots: [],
  }));

  const handler = createGetEventHandler({ getEventDetail });
  const response = await handler({ params: { slug: "evento-publico" } });

  expect(response.status).toBe(200);
  if (response.status !== 200) return;

  expect(getEventDetail).toHaveBeenCalledWith({ slug: "evento-publico" });
  expect(response.body.data.event.slug).toBe("evento-publico");
});

test("EVT-007 RED: maps not-found for missing slug", async () => {
  const handler = createGetEventHandler({
    getEventDetail: async () => {
      throw createNotFoundError("Event not found");
    },
  });

  const response = await handler({ params: { slug: "missing-slug" } });

  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe("not-found");
});
