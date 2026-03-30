import { describe, expect, test, vi } from "vitest";
import { createUnauthenticatedError } from "../../../../../src/server/application/errors";
import {
  createPublishEventRouteAdapter,
  createUpdateEventRouteAdapter,
} from "../../../../../src/server/api/events/events.route-adapter";

const SESSION_ORGANIZER = { userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5", role: "organizer" as const };
const SESSION_ADMIN = { userId: "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9", role: "admin" as const };

describe("event route adapters", () => {
  test("publish adapter extracts session and forwards actor + body to handler", async () => {
    const getSession = vi.fn(async () => SESSION_ORGANIZER);
    const handlePublishEvent = vi.fn(async () => ({
      status: 200 as const,
      body: { data: { eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8", status: "published" as const } },
    }));

    const adapter = createPublishEventRouteAdapter({ getSession, handlePublishEvent });

    const response = await adapter(
      new Request("http://localhost/api/events/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8", status: "published" },
    });

    expect(handlePublishEvent).toHaveBeenCalledWith({
      actor: { role: "organizer", userId: SESSION_ORGANIZER.userId },
      body: { eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8" },
    });
  });

  test("update adapter extracts session and forwards actor + body to handler", async () => {
    const getSession = vi.fn(async () => SESSION_ADMIN);
    const handleUpdateEvent = vi.fn(async () => ({
      status: 200 as const,
      body: { data: { eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8", status: "cancelled" as const } },
    }));

    const adapter = createUpdateEventRouteAdapter({ getSession, handleUpdateEvent });

    const response = await adapter(
      new Request("http://localhost/api/events/update-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8", targetStatus: "cancelled" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8", status: "cancelled" },
    });

    expect(handleUpdateEvent).toHaveBeenCalledWith({
      actor: { role: "admin", userId: SESSION_ADMIN.userId },
      body: { eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8", targetStatus: "cancelled" },
    });
  });

  test("publish adapter returns 401 when session is invalid", async () => {
    const getSession = vi.fn(async () => {
      throw createUnauthenticatedError("Sessão inválida ou expirada");
    });
    const adapter = createPublishEventRouteAdapter({
      getSession,
      handlePublishEvent: async () => {
        throw new Error("handler should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/events/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8" }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "unauthenticated" } });
  });

  test("publish adapter returns 400 when request body is invalid JSON", async () => {
    const getSession = vi.fn(async () => SESSION_ORGANIZER);
    const adapter = createPublishEventRouteAdapter({
      getSession,
      handlePublishEvent: async () => {
        throw new Error("handler should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/events/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{invalid-json}",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "validation" } });
  });
});
