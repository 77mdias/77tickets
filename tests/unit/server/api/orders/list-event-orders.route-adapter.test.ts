import { describe, expect, test, vi } from "vitest";

import { createUnauthenticatedError } from "../../../../../src/server/application/errors";
import { createListEventOrdersRouteAdapter } from "../../../../../src/server/api/orders/list-event-orders.route-adapter";

const SESSION_ORGANIZER = {
  userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
  role: "organizer" as const,
};

describe("createListEventOrdersRouteAdapter", () => {
  test("extracts session and forwards actor + params to handler", async () => {
    const getSession = vi.fn(async () => SESSION_ORGANIZER);
    const handleListEventOrders = vi.fn(async () => ({
      status: 200 as const,
      body: {
        data: {
          orders: [],
        },
      },
    }));

    const adapter = createListEventOrdersRouteAdapter({
      getSession,
      handleListEventOrders,
    });

    const response = await adapter(
      new Request("http://localhost/api/events/2f180791-a8f5-4cf8-b703-0f220a44f7c8/orders"),
      { params: Promise.resolve({ slug: "2f180791-a8f5-4cf8-b703-0f220a44f7c8" }) },
    );

    expect(response.status).toBe(200);
    expect(handleListEventOrders).toHaveBeenCalledWith({
      actor: {
        userId: SESSION_ORGANIZER.userId,
        role: "organizer",
      },
      params: {
        eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
      },
    });
  });

  test("returns 401 when session is invalid", async () => {
    const adapter = createListEventOrdersRouteAdapter({
      getSession: async () => {
        throw createUnauthenticatedError("Sessão inválida ou expirada");
      },
      handleListEventOrders: async () => {
        throw new Error("handler should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/events/2f180791-a8f5-4cf8-b703-0f220a44f7c8/orders"),
      { params: Promise.resolve({ slug: "2f180791-a8f5-4cf8-b703-0f220a44f7c8" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "unauthenticated" },
    });
  });
});
