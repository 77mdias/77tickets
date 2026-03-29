import { describe, expect, test, vi } from "vitest";

import {
  createPublishEventRouteAdapter,
  createUpdateEventRouteAdapter,
} from "../../../../../src/server/api/events/events.route-adapter";

describe("event route adapters", () => {
  test("publish adapter injects actor from headers and forwards handler response", async () => {
    const handlePublishEvent = vi.fn(async () => ({
      status: 200 as const,
      body: {
        data: {
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
          status: "published" as const,
        },
      },
    }));

    const adapter = createPublishEventRouteAdapter({ handlePublishEvent });

    const response = await adapter(
      new Request("http://localhost/api/events/publish", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-actor-id": "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
          "x-actor-role": "organizer",
        },
        body: JSON.stringify({
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
        status: "published",
      },
    });

    expect(handlePublishEvent).toHaveBeenCalledWith({
      actor: {
        role: "organizer",
        userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
      },
      body: {
        eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
      },
    });
  });

  test("update adapter injects actor from headers and forwards handler response", async () => {
    const handleUpdateEvent = vi.fn(async () => ({
      status: 200 as const,
      body: {
        data: {
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
          status: "cancelled" as const,
        },
      },
    }));

    const adapter = createUpdateEventRouteAdapter({ handleUpdateEvent });

    const response = await adapter(
      new Request("http://localhost/api/events/update-status", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-actor-id": "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9",
          "x-actor-role": "admin",
        },
        body: JSON.stringify({
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
          targetStatus: "cancelled",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
        status: "cancelled",
      },
    });

    expect(handleUpdateEvent).toHaveBeenCalledWith({
      actor: {
        role: "admin",
        userId: "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9",
      },
      body: {
        eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
        targetStatus: "cancelled",
      },
    });
  });

  test("returns validation error when actor headers are missing/invalid", async () => {
    const adapter = createPublishEventRouteAdapter({
      handlePublishEvent: async () => {
        throw new Error("handler should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/events/publish", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-actor-id": "not-a-uuid",
        },
        body: JSON.stringify({
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "validation",
      },
    });
  });
});
