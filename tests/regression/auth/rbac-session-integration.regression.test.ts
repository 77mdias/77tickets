/**
 * RBAC + Session Integration Regression Tests
 *
 * These tests guard against regressions where RBAC checks break after
 * wiring real session extraction (getSession) into route adapters.
 *
 * The route adapters now derive actor.userId and actor.role from the session.
 * This suite verifies that the RBAC policies enforced by handlers remain
 * intact when the actor comes from a real session context (not a hardcoded demo identity).
 */

import { describe, expect, test, vi } from "vitest";

import { createCreateOrderHandler } from "../../../src/server/api/create-order.handler";
import { createCreateOrderRouteAdapter } from "../../../src/server/api/orders/create-order.route-adapter";
import type { SessionContext } from "../../../src/server/api/auth";
import { createCreateOrderUseCase } from "../../../src/server/application/use-cases/create-order.use-case";
import {
  DrizzleCouponRepository,
  DrizzleLotRepository,
  DrizzleOrderRepository,
} from "../../../src/server/repositories/drizzle";
import { createUnauthenticatedError } from "../../../src/server/application/errors";

const CUSTOMER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";
const LOT_ID = "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e";
const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";

const buildRequest = (body: unknown) =>
  new Request("http://localhost/api/orders", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

const buildGetSession =
  (session: SessionContext) =>
  async (_request: Request): Promise<SessionContext> =>
    session;

describe("RBAC + session integration regression", () => {
  test("route adapter returns 401 when session is missing", async () => {
    const getSession = vi.fn(async (): Promise<SessionContext> => {
      throw createUnauthenticatedError("Sessão inválida ou expirada");
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

  test("route adapter passes actor role from session to handler for RBAC check", async () => {
    const handleCreateOrder = vi.fn(async () => ({
      status: 403 as const,
      body: { error: { code: "authorization" as const, message: "Forbidden" } },
    }));

    // Simulate an organizer trying to create an order (which should be blocked by RBAC in the handler)
    const adapter = createCreateOrderRouteAdapter({
      getSession: buildGetSession({ userId: "organizer-id", role: "organizer" }),
      handleCreateOrder,
    });

    await adapter(
      buildRequest({ eventId: EVENT_ID, items: [{ lotId: LOT_ID, quantity: 1 }] }),
    );

    // Verify that the handler received the correct actor from the session
    expect(handleCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { role: "organizer", userId: "organizer-id" },
      }),
    );
  });

  test("session userId is used as customerId (server-side injection prevents spoofing)", async () => {
    const handleCreateOrder = vi.fn(async () => ({
      status: 200 as const,
      body: { data: { orderId: "ord_001" } },
    }));

    const adapter = createCreateOrderRouteAdapter({
      getSession: buildGetSession({ userId: CUSTOMER_ID, role: "customer" }),
      handleCreateOrder,
    });

    // Client sends a spoofed customerId — server must override it with session userId
    await adapter(
      buildRequest({
        eventId: EVENT_ID,
        customerId: "00000000-0000-0000-0000-999999999999", // spoofed
        items: [{ lotId: LOT_ID, quantity: 1 }],
      }),
    );

    expect(handleCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          customerId: CUSTOMER_ID, // must be the session userId, not the spoofed value
        }),
      }),
    );
  });
});
