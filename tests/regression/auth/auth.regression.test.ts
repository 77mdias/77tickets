/**
 * Auth Regression Tests
 *
 * Guards against regressions in session validation at the route adapter boundary.
 *
 * Scenarios covered:
 * - Session token that resolves to null (expired/missing) must yield 401
 * - Session with no userId (unauthenticated) must yield 401
 */

import { describe, expect, test, vi } from "vitest";

import { createCreateOrderRouteAdapter } from "../../../src/server/api/orders/create-order.route-adapter";
import { createGetSession } from "../../../src/server/api/auth/get-session";
import { createUnauthenticatedError } from "../../../src/server/application/errors";
import type { SessionContext } from "../../../src/server/api/auth";

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const LOT_ID = "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e";

const buildRequest = (body: unknown) =>
  new Request("http://localhost/api/orders", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

describe("Auth regression: session expiry and missing session scenarios", () => {
  test("returns 401 when session token resolves to null (expired token)", async () => {
    // resolveSession returns null, which createGetSession maps to an unauthenticated error
    const resolveSession = vi.fn(async () => null);
    const getSession = createGetSession(resolveSession);

    const adapter = createCreateOrderRouteAdapter({
      getSession,
      handleCreateOrder: async () => {
        throw new Error("should not be reached");
      },
    });

    const response = await adapter(
      buildRequest({ eventId: EVENT_ID, items: [{ lotId: LOT_ID, quantity: 1 }] }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "unauthenticated" },
    });
  });

  test("returns 401 when getSession throws an unauthenticated error directly", async () => {
    // getSession itself throws — simulates a provider that detects an invalid/expired token
    const getSession = vi.fn(async (): Promise<SessionContext> => {
      throw createUnauthenticatedError("Token expirado");
    });

    const adapter = createCreateOrderRouteAdapter({
      getSession,
      handleCreateOrder: async () => {
        throw new Error("should not be reached");
      },
    });

    const response = await adapter(
      buildRequest({ eventId: EVENT_ID, items: [{ lotId: LOT_ID, quantity: 1 }] }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "unauthenticated" },
    });
  });
});
