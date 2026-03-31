import { describe, expect, test, vi } from "vitest";

import { createUnauthenticatedError } from "../../../../../src/server/application/errors";
import {
  createCreateLotRouteAdapter,
  createUpdateLotRouteAdapter,
} from "../../../../../src/server/api/lots/lots.route-adapter";

const SESSION_ORGANIZER = {
  userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
  role: "organizer" as const,
};

const CREATE_BODY = {
  eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
  title: "VIP",
  priceInCents: 25000,
  totalQuantity: 50,
  maxPerOrder: 2,
  saleStartsAt: "2027-01-01T10:00:00.000Z",
  saleEndsAt: "2027-01-10T22:00:00.000Z",
};

describe("lot route adapters", () => {
  test("create adapter extracts session and forwards actor + body to handler", async () => {
    const getSession = vi.fn(async () => SESSION_ORGANIZER);
    const handleCreateLot = vi.fn(async () => ({
      status: 201 as const,
      body: {
        data: {
          lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
          eventId: CREATE_BODY.eventId,
        },
      },
    }));

    const adapter = createCreateLotRouteAdapter({ getSession, handleCreateLot });

    const response = await adapter(
      new Request("http://localhost/api/lots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(CREATE_BODY),
      }),
    );

    expect(response.status).toBe(201);
    expect(handleCreateLot).toHaveBeenCalledWith({
      actor: { role: "organizer", userId: SESSION_ORGANIZER.userId },
      body: CREATE_BODY,
    });
  });

  test("update adapter extracts session, body, and params to handler", async () => {
    const getSession = vi.fn(async () => SESSION_ORGANIZER);
    const handleUpdateLot = vi.fn(async () => ({
      status: 200 as const,
      body: {
        data: {
          lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
          eventId: CREATE_BODY.eventId,
        },
      },
    }));

    const adapter = createUpdateLotRouteAdapter({ getSession, handleUpdateLot });

    const response = await adapter(
      new Request("http://localhost/api/lots/4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "VIP Updated",
          priceInCents: 30000,
          totalQuantity: 40,
          maxPerOrder: 2,
          saleStartsAt: "2027-01-01T10:00:00.000Z",
          saleEndsAt: "2027-01-10T22:00:00.000Z",
          status: "paused",
        }),
      }),
      { params: Promise.resolve({ id: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e" }) },
    );

    expect(response.status).toBe(200);
    expect(handleUpdateLot).toHaveBeenCalledWith({
      actor: { role: "organizer", userId: SESSION_ORGANIZER.userId },
      body: {
        lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
        title: "VIP Updated",
        priceInCents: 30000,
        totalQuantity: 40,
        maxPerOrder: 2,
        saleStartsAt: "2027-01-01T10:00:00.000Z",
        saleEndsAt: "2027-01-10T22:00:00.000Z",
        status: "paused",
      },
    });
  });

  test("create adapter returns 401 when session is invalid", async () => {
    const getSession = vi.fn(async () => {
      throw createUnauthenticatedError("Sessão inválida ou expirada");
    });
    const adapter = createCreateLotRouteAdapter({
      getSession,
      handleCreateLot: async () => {
        throw new Error("handler should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/lots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(CREATE_BODY),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "unauthenticated" },
    });
  });

  test("create adapter returns 400 when request body is invalid JSON", async () => {
    const getSession = vi.fn(async () => SESSION_ORGANIZER);
    const adapter = createCreateLotRouteAdapter({
      getSession,
      handleCreateLot: async () => {
        throw new Error("handler should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/lots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{invalid-json}",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "validation" },
    });
  });
});
