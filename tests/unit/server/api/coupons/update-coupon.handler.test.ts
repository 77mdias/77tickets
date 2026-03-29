import { expect, test, vi } from "vitest";

import { createUpdateCouponHandler } from "../../../../../src/server/api/coupons/update-coupon.handler";
import { createConflictError } from "../../../../../src/server/application/errors";

const COUPON_ID = "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e";
const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const ORGANIZER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";
const OTHER_ORGANIZER_ID = "00000000-0000-0000-0000-000000000999";

const createCouponRepository = (eventId = EVENT_ID) => ({
  findById: vi.fn(async () => ({
    id: COUPON_ID,
    eventId,
    code: "SAVE10",
    discountType: "percentage" as const,
    discountInCents: null,
    discountPercentage: 10,
    maxRedemptions: 100,
    redemptionCount: 0,
    validFrom: new Date("2026-06-01T00:00:00.000Z"),
    validUntil: new Date("2026-06-30T23:59:59.000Z"),
  })),
});

const createEventRepository = (organizerId = ORGANIZER_ID) => ({
  findById: vi.fn(async () => ({
    id: EVENT_ID,
    organizerId,
    slug: "coupon-update-handler-event",
    title: "Coupon Update Handler Event",
    status: "draft" as const,
    startsAt: new Date("2027-06-01T10:00:00.000Z"),
    endsAt: null,
  })),
});

test("returns 400 validation error for invalid payload", async () => {
  const couponRepository = createCouponRepository();
  const eventRepository = createEventRepository();
  const updateCoupon = vi.fn();

  const handler = createUpdateCouponHandler({
    couponRepository,
    eventRepository,
    updateCoupon,
  });

  const response = await handler({
    actor: {
      role: "organizer",
      userId: ORGANIZER_ID,
    },
    body: {
      couponId: "invalid-uuid",
      code: "SAVE20",
    },
  });

  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("validation");
  expect(couponRepository.findById).not.toHaveBeenCalled();
  expect(updateCoupon).not.toHaveBeenCalled();
});

test("returns 404 when coupon does not exist", async () => {
  const couponRepository = {
    findById: vi.fn(async () => null),
  };
  const eventRepository = createEventRepository();
  const updateCoupon = vi.fn();

  const handler = createUpdateCouponHandler({
    couponRepository,
    eventRepository,
    updateCoupon,
  });

  const response = await handler({
    actor: {
      role: "organizer",
      userId: ORGANIZER_ID,
    },
    body: {
      couponId: COUPON_ID,
      code: "SAVE20",
      discountType: "percentage",
      discountInCents: null,
      discountPercentage: 20,
      maxRedemptions: 100,
      validFrom: "2026-06-01T00:00:00.000Z",
      validUntil: "2026-06-30T23:59:59.000Z",
    },
  });

  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe("not-found");
  expect(updateCoupon).not.toHaveBeenCalled();
});

test("blocks organizer outside ownership scope", async () => {
  const couponRepository = createCouponRepository();
  const eventRepository = createEventRepository(OTHER_ORGANIZER_ID);
  const updateCoupon = vi.fn();

  const handler = createUpdateCouponHandler({
    couponRepository,
    eventRepository,
    updateCoupon,
  });

  const response = await handler({
    actor: {
      role: "organizer",
      userId: ORGANIZER_ID,
    },
    body: {
      couponId: COUPON_ID,
      code: "SAVE20",
      discountType: "percentage",
      discountInCents: null,
      discountPercentage: 20,
      maxRedemptions: 100,
      validFrom: "2026-06-01T00:00:00.000Z",
      validUntil: "2026-06-30T23:59:59.000Z",
    },
  });

  expect(response.status).toBe(403);
  expect(response.body.error.code).toBe("authorization");
  expect(updateCoupon).not.toHaveBeenCalled();
});

test("allows admin and delegates to updateCoupon use-case", async () => {
  const couponRepository = createCouponRepository();
  const eventRepository = createEventRepository(OTHER_ORGANIZER_ID);
  const updateCoupon = vi.fn(async () => ({
    couponId: COUPON_ID,
    eventId: EVENT_ID,
    code: "SAVE20",
    discountType: "percentage" as const,
    discountInCents: null,
    discountPercentage: 20,
    maxRedemptions: 100,
    redemptionCount: 0,
    validFrom: new Date("2026-06-01T00:00:00.000Z"),
    validUntil: new Date("2026-06-30T23:59:59.000Z"),
  }));

  const handler = createUpdateCouponHandler({
    couponRepository,
    eventRepository,
    updateCoupon,
  });

  const response = await handler({
    actor: {
      role: "admin",
      userId: "00000000-0000-0000-0000-000000000099",
    },
    body: {
      couponId: COUPON_ID,
      code: "  save20 ",
      discountType: "percentage",
      discountInCents: null,
      discountPercentage: 20,
      maxRedemptions: 100,
      validFrom: "2026-06-01T00:00:00.000Z",
      validUntil: "2026-06-30T23:59:59.000Z",
    },
  });

  expect(response.status).toBe(200);
  expect(updateCoupon).toHaveBeenCalledWith({
    couponId: COUPON_ID,
    code: "save20",
    discountType: "percentage",
    discountInCents: null,
    discountPercentage: 20,
    maxRedemptions: 100,
    validFrom: new Date("2026-06-01T00:00:00.000Z"),
    validUntil: new Date("2026-06-30T23:59:59.000Z"),
  });
});

test("maps use-case conflict errors with stable response shape", async () => {
  const couponRepository = createCouponRepository();
  const eventRepository = createEventRepository();
  const updateCoupon = vi.fn(async () => {
    throw createConflictError("Coupon governance conflict", {
      details: { reason: "coupon_code_already_exists" },
    });
  });

  const handler = createUpdateCouponHandler({
    couponRepository,
    eventRepository,
    updateCoupon,
  });

  const response = await handler({
    actor: {
      role: "organizer",
      userId: ORGANIZER_ID,
    },
    body: {
      couponId: COUPON_ID,
      code: "save20",
      discountType: "percentage",
      discountInCents: null,
      discountPercentage: 20,
      maxRedemptions: 100,
      validFrom: "2026-06-01T00:00:00.000Z",
      validUntil: "2026-06-30T23:59:59.000Z",
    },
  });

  expect(response.status).toBe(409);
  expect(response.body.error.code).toBe("conflict");
  expect(response.body.error.details).toEqual({ reason: "coupon_code_already_exists" });
});

