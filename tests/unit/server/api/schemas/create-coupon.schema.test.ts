import { expect, test } from "vitest";

import { createCouponSchema } from "../../../../../src/server/api/schemas";

test("createCouponSchema rejects payload with missing required fields", () => {
  const result = createCouponSchema.safeParse({});

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected createCouponSchema to reject missing fields");
  }

  expect(result.error.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: ["eventId"] }),
      expect.objectContaining({ path: ["code"] }),
      expect.objectContaining({ path: ["discountType"] }),
      expect.objectContaining({ path: ["maxRedemptions"] }),
      expect.objectContaining({ path: ["validFrom"] }),
      expect.objectContaining({ path: ["validUntil"] }),
    ]),
  );
});

test("createCouponSchema rejects fixed coupon without discountInCents", () => {
  const result = createCouponSchema.safeParse({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    code: "save10",
    discountType: "fixed",
    discountPercentage: null,
    maxRedemptions: 10,
    validFrom: "2026-06-01T00:00:00.000Z",
    validUntil: "2026-06-30T23:59:59.000Z",
  });

  expect(result.success).toBe(false);
});

test("createCouponSchema rejects percentage coupon with out-of-range percentage", () => {
  const result = createCouponSchema.safeParse({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    code: "save200",
    discountType: "percentage",
    discountPercentage: 200,
    discountInCents: null,
    maxRedemptions: 10,
    validFrom: "2026-06-01T00:00:00.000Z",
    validUntil: "2026-06-30T23:59:59.000Z",
  });

  expect(result.success).toBe(false);
});

test("createCouponSchema accepts valid payload and parses dates", () => {
  const result = createCouponSchema.safeParse({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    code: "  save20  ",
    discountType: "percentage",
    discountPercentage: 20,
    discountInCents: null,
    maxRedemptions: 100,
    validFrom: "2026-06-01T00:00:00.000Z",
    validUntil: "2026-06-30T23:59:59.000Z",
  });

  expect(result.success).toBe(true);

  if (!result.success) {
    throw new Error("Expected createCouponSchema to accept valid payload");
  }

  expect(result.data).toMatchObject({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    code: "save20",
    discountType: "percentage",
    discountPercentage: 20,
    discountInCents: null,
    maxRedemptions: 100,
  });

  expect(result.data.validFrom).toBeInstanceOf(Date);
  expect(result.data.validUntil).toBeInstanceOf(Date);
});
