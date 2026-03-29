import { describe, expect, test, vi } from "vitest";

import {
  createCreateCouponRouteAdapter,
  createUpdateCouponRouteAdapter,
} from "../../../../../src/server/api/coupons/coupons.route-adapter";

describe("coupon route adapters", () => {
  test("create adapter injects actor from headers and forwards handler response", async () => {
    const handleCreateCoupon = vi.fn(async () => ({
      status: 200 as const,
      body: {
        data: {
          couponId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
          code: "SAVE20",
        },
      },
    }));

    const adapter = createCreateCouponRouteAdapter({ handleCreateCoupon });

    const response = await adapter(
      new Request("http://localhost/api/coupons/create", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-actor-id": "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
          "x-actor-role": "organizer",
        },
        body: JSON.stringify({
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
          code: "SAVE20",
          discountType: "percentage",
          discountInCents: null,
          discountPercentage: 20,
          maxRedemptions: 100,
          validFrom: "2026-06-01T00:00:00.000Z",
          validUntil: "2026-06-30T23:59:59.000Z",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        couponId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
        eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
        code: "SAVE20",
      },
    });

    expect(handleCreateCoupon).toHaveBeenCalledWith({
      actor: {
        role: "organizer",
        userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
      },
      body: {
        eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
        code: "SAVE20",
        discountType: "percentage",
        discountInCents: null,
        discountPercentage: 20,
        maxRedemptions: 100,
        validFrom: "2026-06-01T00:00:00.000Z",
        validUntil: "2026-06-30T23:59:59.000Z",
      },
    });
  });

  test("update adapter injects actor from headers and forwards handler response", async () => {
    const handleUpdateCoupon = vi.fn(async () => ({
      status: 200 as const,
      body: {
        data: {
          couponId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
          code: "SAVE20",
        },
      },
    }));

    const adapter = createUpdateCouponRouteAdapter({ handleUpdateCoupon });

    const response = await adapter(
      new Request("http://localhost/api/coupons/update", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-actor-id": "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9",
          "x-actor-role": "admin",
        },
        body: JSON.stringify({
          couponId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
          code: "SAVE20",
          discountType: "percentage",
          discountInCents: null,
          discountPercentage: 20,
          maxRedemptions: 100,
          validFrom: "2026-06-01T00:00:00.000Z",
          validUntil: "2026-06-30T23:59:59.000Z",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        couponId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
        eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
        code: "SAVE20",
      },
    });

    expect(handleUpdateCoupon).toHaveBeenCalledWith({
      actor: {
        role: "admin",
        userId: "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9",
      },
      body: {
        couponId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
        code: "SAVE20",
        discountType: "percentage",
        discountInCents: null,
        discountPercentage: 20,
        maxRedemptions: 100,
        validFrom: "2026-06-01T00:00:00.000Z",
        validUntil: "2026-06-30T23:59:59.000Z",
      },
    });
  });

  test("returns validation error when actor headers are missing/invalid", async () => {
    const adapter = createCreateCouponRouteAdapter({
      handleCreateCoupon: async () => {
        throw new Error("handler should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/coupons/create", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-actor-id": "not-a-uuid",
        },
        body: JSON.stringify({
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
          code: "SAVE20",
          discountType: "percentage",
          discountInCents: null,
          discountPercentage: 20,
          maxRedemptions: 100,
          validFrom: "2026-06-01T00:00:00.000Z",
          validUntil: "2026-06-30T23:59:59.000Z",
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

