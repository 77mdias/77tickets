import { describe, expect, test, vi } from "vitest";
import { createUnauthenticatedError } from "../../../../../src/server/application/errors";
import {
  createCreateCouponRouteAdapter,
  createUpdateCouponRouteAdapter,
} from "../../../../../src/server/api/coupons/coupons.route-adapter";

const SESSION_ORGANIZER = { userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5", role: "organizer" as const };
const SESSION_ADMIN = { userId: "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9", role: "admin" as const };

const COUPON_BODY = {
  eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
  code: "SAVE20",
  discountType: "percentage",
  discountInCents: null,
  discountPercentage: 20,
  maxRedemptions: 100,
  validFrom: "2026-06-01T00:00:00.000Z",
  validUntil: "2026-06-30T23:59:59.000Z",
};

describe("coupon route adapters", () => {
  test("create adapter extracts session and forwards actor + body to handler", async () => {
    const getSession = vi.fn(async () => SESSION_ORGANIZER);
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

    const adapter = createCreateCouponRouteAdapter({ getSession, handleCreateCoupon });

    const response = await adapter(
      new Request("http://localhost/api/coupons/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(COUPON_BODY),
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
      actor: { role: "organizer", userId: SESSION_ORGANIZER.userId },
      body: COUPON_BODY,
    });
  });

  test("update adapter extracts session and forwards actor + body to handler", async () => {
    const getSession = vi.fn(async () => SESSION_ADMIN);
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

    const UPDATE_BODY = {
      couponId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
      code: "SAVE20",
      discountType: "percentage",
      discountInCents: null,
      discountPercentage: 20,
      maxRedemptions: 100,
      validFrom: "2026-06-01T00:00:00.000Z",
      validUntil: "2026-06-30T23:59:59.000Z",
    };

    const adapter = createUpdateCouponRouteAdapter({ getSession, handleUpdateCoupon });

    const response = await adapter(
      new Request("http://localhost/api/coupons/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(UPDATE_BODY),
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
      actor: { role: "admin", userId: SESSION_ADMIN.userId },
      body: UPDATE_BODY,
    });
  });

  test("create adapter returns 401 when session is invalid", async () => {
    const getSession = vi.fn(async () => {
      throw createUnauthenticatedError("Sessão inválida ou expirada");
    });
    const adapter = createCreateCouponRouteAdapter({
      getSession,
      handleCreateCoupon: async () => {
        throw new Error("handler should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/coupons/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(COUPON_BODY),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "unauthenticated" } });
  });

  test("create adapter returns 400 when request body is invalid JSON", async () => {
    const getSession = vi.fn(async () => SESSION_ORGANIZER);
    const adapter = createCreateCouponRouteAdapter({
      getSession,
      handleCreateCoupon: async () => {
        throw new Error("handler should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/coupons/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{invalid-json}",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "validation" } });
  });
});
