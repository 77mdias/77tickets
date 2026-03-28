import { describe, expect, test } from "vitest";

import {
  buildCheckoutPayload,
  extractCheckoutErrorMessage,
} from "../../../../src/features/checkout/checkout-client";

describe("buildCheckoutPayload", () => {
  test("builds endpoint payload without client-side totals or stock checks", () => {
    const payload = buildCheckoutPayload({
      eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
      lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
      quantity: "2",
      couponCode: " SAVE20 ",
    });

    expect(payload).toEqual({
      eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
      items: [{ lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e", quantity: 2 }],
      couponCode: "SAVE20",
    });
  });

  test("omits couponCode when empty after trim", () => {
    const payload = buildCheckoutPayload({
      eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
      lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
      quantity: "1",
      couponCode: "   ",
    });

    expect(payload).toEqual({
      eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
      items: [{ lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e", quantity: 1 }],
    });
  });
});

describe("extractCheckoutErrorMessage", () => {
  test("returns backend message when available", () => {
    const message = extractCheckoutErrorMessage({
      error: {
        code: "conflict",
        message: "Create order conflict",
      },
    });

    expect(message).toBe("Create order conflict");
  });

  test("uses fallback for malformed payload", () => {
    expect(extractCheckoutErrorMessage(null)).toBe(
      "Could not complete checkout. Please review your input and try again.",
    );
  });
});
