import { describe, expect, test } from "vitest";

import {
  buildCreateCouponPayload,
  buildManagementActorHeaders,
  buildPublishEventPayload,
  buildUpdateCouponPayload,
  buildUpdateEventStatusPayload,
  extractManagementErrorMessage,
} from "../../../../src/features/admin/management-client";

describe("buildManagementActorHeaders", () => {
  test("builds actor headers with trimmed actor id", () => {
    const headers = buildManagementActorHeaders({
      actorId: " 00000000-0000-0000-0000-000000000099 ",
      role: "admin",
    });

    expect(headers).toEqual({
      "content-type": "application/json",
      "x-actor-id": "00000000-0000-0000-0000-000000000099",
      "x-actor-role": "admin",
    });
  });
});

describe("build event payloads", () => {
  test("builds publish payload with trimmed event id", () => {
    expect(
      buildPublishEventPayload({
        eventId: " 2f180791-a8f5-4cf8-b703-0f220a44f7c8 ",
      }),
    ).toEqual({
      eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    });
  });

  test("builds update-status payload with explicit target status", () => {
    expect(
      buildUpdateEventStatusPayload({
        eventId: " 2f180791-a8f5-4cf8-b703-0f220a44f7c8 ",
        targetStatus: "cancelled",
      }),
    ).toEqual({
      eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
      targetStatus: "cancelled",
    });
  });
});

describe("build coupon payloads", () => {
  test("builds create coupon payload for fixed discounts", () => {
    const payload = buildCreateCouponPayload({
      eventId: " 2f180791-a8f5-4cf8-b703-0f220a44f7c8 ",
      code: " SAVE20 ",
      discountType: "fixed",
      discountInCents: "1500",
      discountPercentage: "",
      maxRedemptions: "100",
      validFrom: "2026-06-01T00:00",
      validUntil: "2026-06-30T23:59",
    });

    expect(payload).toMatchObject({
      eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
      code: "SAVE20",
      discountType: "fixed",
      discountInCents: 1500,
      discountPercentage: null,
      maxRedemptions: 100,
    });
  });

  test("builds update coupon payload for percentage discounts", () => {
    const payload = buildUpdateCouponPayload({
      couponId: " 4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e ",
      code: " SAVE10 ",
      discountType: "percentage",
      discountInCents: "",
      discountPercentage: "20",
      maxRedemptions: "50",
      validFrom: "2026-06-01T00:00",
      validUntil: "2026-06-30T23:59",
    });

    expect(payload).toMatchObject({
      couponId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
      code: "SAVE10",
      discountType: "percentage",
      discountInCents: null,
      discountPercentage: 20,
      maxRedemptions: 50,
    });
  });
});

describe("extractManagementErrorMessage", () => {
  test("returns backend error message when present", () => {
    const message = extractManagementErrorMessage({
      error: {
        code: "conflict",
        message: "Publish conflict",
      },
    });

    expect(message).toBe("Publish conflict");
  });

  test("returns fallback for malformed payload", () => {
    expect(extractManagementErrorMessage(null)).toBe(
      "Could not complete administrative operation. Please review your input and try again.",
    );
  });
});
