import { describe, expect, test, vi } from "vitest";

import { createUnauthenticatedError } from "../../../../../src/server/application/errors";
import { createGetCustomerOrdersRouteAdapter } from "../../../../../src/server/api/orders/get-customer-orders.route-adapter";

describe("createGetCustomerOrdersRouteAdapter", () => {
  test("extracts session and forwards actor to handler", async () => {
    const getSession = vi.fn(async () => ({
      userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
      role: "customer" as const,
    }));

    const handleGetCustomerOrders = vi.fn(async () => ({
      status: 200 as const,
      body: { data: { orders: [] } },
    }));

    const adapter = createGetCustomerOrdersRouteAdapter({ getSession, handleGetCustomerOrders });
    const response = await adapter(new Request("http://localhost/api/orders/mine"));

    expect(response.status).toBe(200);
    expect(handleGetCustomerOrders).toHaveBeenCalledWith({
      actor: {
        userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
        role: "customer",
      },
    });
  });

  test("returns 401 when session is invalid", async () => {
    const adapter = createGetCustomerOrdersRouteAdapter({
      getSession: async () => {
        throw createUnauthenticatedError("Sessão inválida ou expirada");
      },
      handleGetCustomerOrders: async () => {
        throw new Error("handler should not be called");
      },
    });

    const response = await adapter(new Request("http://localhost/api/orders/mine"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "unauthenticated" },
    });
  });
});
