import { expect, test, vi } from "vitest";

import { createUpdateCouponUseCase } from "../../../src/server/application/use-cases/update-coupon.use-case";

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const COUPON_ID = "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e";
const NOW = new Date("2026-06-01T00:00:00.000Z");

test("createUpdateCouponUseCase returns not-found when coupon does not exist", async () => {
  const update = vi.fn(async () => undefined);

  const useCase = createUpdateCouponUseCase({
    couponRepository: {
      findById: vi.fn(async () => null),
      findByCodeForEvent: vi.fn(async () => null),
      update,
    },
  });

  await expect(
    useCase({
      couponId: COUPON_ID,
      code: "SAVE20",
      discountType: "percentage",
      discountInCents: null,
      discountPercentage: 20,
      maxRedemptions: 100,
      validFrom: NOW,
      validUntil: NOW,
    }),
  ).rejects.toMatchObject({
    code: "not-found",
  });

  expect(update).not.toHaveBeenCalled();
});

test("createUpdateCouponUseCase rejects duplicate code when used by another coupon", async () => {
  const update = vi.fn(async () => undefined);

  const useCase = createUpdateCouponUseCase({
    couponRepository: {
      findById: vi.fn(async () => ({
        id: COUPON_ID,
        eventId: EVENT_ID,
        code: "SAVE10",
        discountInCents: null,
        discountPercentage: 10,
        maxRedemptions: 100,
        redemptionCount: 0,
        validFrom: NOW,
        validUntil: NOW,
      })),
      findByCodeForEvent: vi.fn(async () => ({
        id: "other-coupon-id",
        eventId: EVENT_ID,
        code: "SAVE20",
        discountInCents: null,
        discountPercentage: 20,
        maxRedemptions: 100,
        redemptionCount: 0,
        validFrom: NOW,
        validUntil: NOW,
      })),
      update,
    },
  });

  await expect(
    useCase({
      couponId: COUPON_ID,
      code: " SAVE20 ",
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

  expect(update).not.toHaveBeenCalled();
});

test("createUpdateCouponUseCase normalizes code to uppercase and persists updates", async () => {
  const update = vi.fn(async () => undefined);

  const useCase = createUpdateCouponUseCase({
    couponRepository: {
      findById: vi.fn(async () => ({
        id: COUPON_ID,
        eventId: EVENT_ID,
        code: "SAVE10",
        discountInCents: null,
        discountPercentage: 10,
        maxRedemptions: 100,
        redemptionCount: 0,
        validFrom: NOW,
        validUntil: NOW,
      })),
      findByCodeForEvent: vi.fn(async () => null),
      update,
    },
  });

  const result = await useCase({
    couponId: COUPON_ID,
    code: " save20 ",
    discountType: "percentage",
    discountInCents: null,
    discountPercentage: 20,
    maxRedemptions: 100,
    validFrom: new Date("2026-06-10T00:00:00.000Z"),
    validUntil: new Date("2026-06-30T23:59:59.000Z"),
  });

  expect(update).toHaveBeenCalledWith({
    id: COUPON_ID,
    eventId: EVENT_ID,
    code: "SAVE20",
    discountType: "percentage",
    discountInCents: null,
    discountPercentage: 20,
    maxRedemptions: 100,
    redemptionCount: 0,
    validFrom: new Date("2026-06-10T00:00:00.000Z"),
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
    validFrom: new Date("2026-06-10T00:00:00.000Z"),
    validUntil: new Date("2026-06-30T23:59:59.000Z"),
  });
});

test("createUpdateCouponUseCase rejects invalid coupon window", async () => {
  const useCase = createUpdateCouponUseCase({
    couponRepository: {
      findById: vi.fn(async () => ({
        id: COUPON_ID,
        eventId: EVENT_ID,
        code: "SAVE10",
        discountInCents: null,
        discountPercentage: 10,
        maxRedemptions: 100,
        redemptionCount: 0,
        validFrom: NOW,
        validUntil: NOW,
      })),
      findByCodeForEvent: vi.fn(async () => null),
      update: vi.fn(async () => undefined),
    },
  });

  await expect(
    useCase({
      couponId: COUPON_ID,
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

