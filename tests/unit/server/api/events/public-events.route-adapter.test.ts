import { describe, expect, test, vi } from "vitest";

import {
  createGetEventRouteAdapter,
  createListEventsRouteAdapter,
} from "../../../../../src/server/api/events/public-events.route-adapter";

describe("public events route adapters", () => {
  test("list adapter forwards query params to handler", async () => {
    const handleListEvents = vi.fn(async () => ({
      status: 200 as const,
      body: { data: { page: 1, limit: 10, events: [] } },
    }));

    const adapter = createListEventsRouteAdapter({ handleListEvents });
    const response = await adapter(new Request("http://localhost/api/events?page=2&limit=5"));

    expect(response.status).toBe(200);
    expect(handleListEvents).toHaveBeenCalledWith({
      query: { page: "2", limit: "5" },
    });
  });

  test("get adapter forwards slug params to handler", async () => {
    const handleGetEvent = vi.fn(async () => ({
      status: 200 as const,
      body: { data: { event: { slug: "evento-publico" }, lots: [] } },
    }));

    const adapter = createGetEventRouteAdapter({ handleGetEvent });
    const response = await adapter(
      new Request("http://localhost/api/events/evento-publico"),
      { params: Promise.resolve({ slug: "evento-publico" }) },
    );

    expect(response.status).toBe(200);
    expect(handleGetEvent).toHaveBeenCalledWith({
      params: { slug: "evento-publico" },
    });
  });
});
