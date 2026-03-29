import { expect, test, vi } from "vitest";

import { createCreateCouponUseCase } from "../../../src/server/application/use-cases/create-coupon.use-case";

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const COUPON_ID = "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e";
const NOW = new Date("2026-06-01T00:00:00.000Z");

test("createCreateCouponUseCase normalizes code to uppercase and persists coupon", async () => {
  const createCoupon = vi.fn(async () => ({
    id: COUPON_ID,
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

  const useCase = createCreateCouponUseCase({
    couponRepository: {
      findByCodeForEvent: vi.fn(async () => null),
      create: createCoupon,
    },
  });

  const result = await useCase({
    eventId: EVENT_ID,
    code: "  save20 ",
    discountType: "percentage",
    discountInCents: null,
    discountPercentage: 20,
    maxRedemptions: 100,
    validFrom: new Date("2026-06-01T00:00:00.000Z"),
    validUntil: new Date("2026-06-30T23:59:59.000Z"),
  });

  expect(createCoupon).toHaveBeenCalledWith({
    eventId: EVENT_ID,
    code: "SAVE20",
    discountType: "percentage",
    discountInCents: null,
    discountPercentage: 20,
    maxRedemptions: 100,
    redemptionCount: 0,
    validFrom: new Date("2026-06-01T00:00:00.000Z"),
    validUntil: new Date("2026-06-30T23:59:59.000Z"),
  });
  expect(result).toEqual({
    couponId: COUPON_ID,
    eventId: EVENT_ID,
    code: "SAVE20",
    discountType: "percentage",
    discountInCents: null,
    discountPercentage: 20,
    maxRedemptions: 100,
    redemptionCount: 0,
    validFrom: new Date("2026-06-01T00:00:00.000Z"),
    validUntil: new Date("2026-06-30T23:59:59.000Z"),
  });
});

test("createCreateCouponUseCase rejects duplicate code in the same event", async () => {
  const createCoupon = vi.fn(async () => ({
    id: COUPON_ID,
    eventId: EVENT_ID,
    code: "SAVE20",
    discountInCents: null,
    discountPercentage: 20,
    maxRedemptions: 100,
    redemptionCount: 0,
    validFrom: NOW,
    validUntil: NOW,
  }));

  const useCase = createCreateCouponUseCase({
    couponRepository: {
      findByCodeForEvent: vi.fn(async () => ({
        id: "existing-id",
        eventId: EVENT_ID,
        code: "SAVE20",
        discountInCents: null,
        discountPercentage: 20,
        maxRedemptions: 100,
        redemptionCount: 2,
        validFrom: NOW,
        validUntil: NOW,
      })),
      create: createCoupon,
    },
  });

  await expect(
    useCase({
      eventId: EVENT_ID,
      code: "SAVE20",
      discountType: "percentage",
      discountInCents: null,
      discountPercentage: 20,
      maxRedemptions: 100,
      validFrom: NOW,
      validUntil: NOW,
    }),
  ).rejects.toMatchObject({
    code: "conflict",
    details: { reason: "coupon_code_already_exists" },
  });

  expect(createCoupon).not.toHaveBeenCalled();
});

test("createCreateCouponUseCase rejects invalid coupon window", async () => {
  const useCase = createCreateCouponUseCase({
    couponRepository: {
      findByCodeForEvent: vi.fn(async () => null),
      create: vi.fn(async () => ({
        id: COUPON_ID,
        eventId: EVENT_ID,
        code: "SAVE20",
        discountInCents: null,
        discountPercentage: 20,
        maxRedemptions: 100,
        redemptionCount: 0,
        validFrom: NOW,
        validUntil: NOW,
      })),
    },
  });

  await expect(
    useCase({
      eventId: EVENT_ID,
      code: "SAVE20",
      discountType: "percentage",
      discountInCents: null,
      discountPercentage: 20,
      maxRedemptions: 100,
      validFrom: new Date("2026-07-01T00:00:00.000Z"),
      validUntil: new Date("2026-06-30T23:59:59.000Z"),
    }),
  ).rejects.toMatchObject({
    code: "conflict",
    details: { reason: "invalid_coupon_window" },
  });
});

test("createCreateCouponUseCase rejects invalid discount shape", async () => {
  const useCase = createCreateCouponUseCase({
    couponRepository: {
      findByCodeForEvent: vi.fn(async () => null),
      create: vi.fn(async () => ({
        id: COUPON_ID,
        eventId: EVENT_ID,
        code: "SAVE20",
        discountInCents: null,
        discountPercentage: 20,
        maxRedemptions: 100,
        redemptionCount: 0,
        validFrom: NOW,
        validUntil: NOW,
      })),
    },
  });

  await expect(
    useCase({
      eventId: EVENT_ID,
      code: "SAVE20",
      discountType: "fixed",
      discountInCents: null,
      discountPercentage: 20,
      maxRedemptions: 100,
      validFrom: NOW,
      validUntil: NOW,
    }),
  ).rejects.toMatchObject({
    code: "conflict",
    details: { reason: "invalid_coupon_discount" },
  });
});
