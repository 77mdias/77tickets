import { expect, test } from "vitest";

import { updateCouponSchema } from "../../../../../src/server/api/schemas";

test("updateCouponSchema rejects payload with missing required fields", () => {
  const result = updateCouponSchema.safeParse({});

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected updateCouponSchema to reject missing fields");
  }

  expect(result.error.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: ["couponId"] }),
      expect.objectContaining({ path: ["code"] }),
      expect.objectContaining({ path: ["discountType"] }),
      expect.objectContaining({ path: ["maxRedemptions"] }),
      expect.objectContaining({ path: ["validFrom"] }),
      expect.objectContaining({ path: ["validUntil"] }),
    ]),
  );
});

test("updateCouponSchema rejects fixed coupon without discountInCents", () => {
  const result = updateCouponSchema.safeParse({
    couponId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
    code: "fixed10",
    discountType: "fixed",
    discountInCents: null,
    discountPercentage: null,
    maxRedemptions: 10,
    validFrom: "2026-07-01T00:00:00.000Z",
    validUntil: "2026-07-31T23:59:59.000Z",
  });

  expect(result.success).toBe(false);
});

test("updateCouponSchema rejects payload with unknown fields", () => {
  const result = updateCouponSchema.safeParse({
    couponId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
    code: "save20",
    discountType: "percentage",
    discountPercentage: 20,
    discountInCents: null,
    maxRedemptions: 100,
    validFrom: "2026-07-01T00:00:00.000Z",
    validUntil: "2026-07-31T23:59:59.000Z",
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
  });

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected updateCouponSchema to reject unknown fields");
  }

  expect(result.error.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "unrecognized_keys",
        keys: ["eventId"],
      }),
    ]),
  );
});

test("updateCouponSchema accepts valid payload and trims code", () => {
  const result = updateCouponSchema.safeParse({
    couponId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
    code: "  save20  ",
    discountType: "percentage",
    discountPercentage: 20,
    discountInCents: null,
    maxRedemptions: 100,
    validFrom: "2026-07-01T00:00:00.000Z",
    validUntil: "2026-07-31T23:59:59.000Z",
  });

  expect(result.success).toBe(true);

  if (!result.success) {
    throw new Error("Expected updateCouponSchema to accept valid payload");
  }

  expect(result.data).toMatchObject({
    couponId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
    code: "save20",
    discountType: "percentage",
    discountPercentage: 20,
    discountInCents: null,
    maxRedemptions: 100,
  });
});
