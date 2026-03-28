import { describe, expect, test, vi } from "vitest";

import {
  createCreateOrderRouteAdapter,
  resolveDemoCustomerId,
} from "../../../../src/server/api/orders/create-order.route-adapter";

describe("createCreateOrderRouteAdapter", () => {
  test("injects server-side customer identity and forwards handler result", async () => {
    const handleCreateOrder = vi.fn(async () => ({
      status: 200 as const,
      body: {
        data: {
          orderId: "ord_001",
        },
      },
    }));

    const adapter = createCreateOrderRouteAdapter({
      customerId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
      handleCreateOrder,
    });

    const response = await adapter(
      new Request("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
          customerId: "00000000-0000-0000-0000-000000000999",
          items: [{ lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e", quantity: 1 }],
        }),
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        orderId: "ord_001",
      },
    });
    expect(handleCreateOrder).toHaveBeenCalledWith({
      actor: {
        role: "customer",
        userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
      },
      body: {
        eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
        customerId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
        items: [{ lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e", quantity: 1 }],
      },
    });
  });

  test("returns structured validation error when request body is invalid json", async () => {
    const adapter = createCreateOrderRouteAdapter({
      customerId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
      handleCreateOrder: async () => {
        throw new Error("handler should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/orders", {
        method: "POST",
        body: "{invalid-json}",
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "validation",
        message: "Invalid request payload",
      },
    });
  });
});

describe("resolveDemoCustomerId", () => {
  test("returns fallback UUID for missing or invalid values", () => {
    const fallback = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";

    expect(resolveDemoCustomerId(undefined, fallback)).toBe(fallback);
    expect(resolveDemoCustomerId("not-a-uuid", fallback)).toBe(fallback);
  });

  test("returns normalized UUID when env value is valid", () => {
    const fallback = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";
    const value = "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9";

    expect(resolveDemoCustomerId(value, fallback)).toBe(value);
  });
});
