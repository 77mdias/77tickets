import { expect, test, vi } from "vitest";

import { createListEventsHandler } from "../../../../../src/server/api/events/list-events.handler";

test("EVT-006 RED: returns paginated published events", async () => {
  const listPublishedEvents = vi.fn(async () => ({
    page: 2,
    limit: 5,
    events: [
      {
        id: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
        slug: "public-event",
        title: "Public Event",
        startsAt: new Date("2099-05-10T18:00:00.000Z"),
        imageUrl: null,
        location: "Sao Paulo",
      },
    ],
  }));

  const handler = createListEventsHandler({ listPublishedEvents });
  const response = await handler({ query: { page: "2", limit: "5" } });

  expect(response.status).toBe(200);
  if (response.status !== 200) return;

  expect(listPublishedEvents).toHaveBeenCalledWith({ page: 2, limit: 5 });
  expect(response.body.data.events).toHaveLength(1);
});

test("EVT-006 RED: returns validation error for invalid pagination query", async () => {
  const handler = createListEventsHandler({
    listPublishedEvents: async () => {
      throw new Error("should not be called");
    },
  });

  const response = await handler({ query: { page: "abc", limit: "-1" } });

  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("validation");
});
