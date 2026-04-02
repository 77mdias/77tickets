import { describe, expect, test } from "vitest";

import {
  buildCheckoutPayload,
  extractCheckoutErrorMessage,
  extractCheckoutRedirectTarget,
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

describe("extractCheckoutRedirectTarget", () => {
  test("returns an internal redirect target for a relative checkoutUrl in the payload", () => {
    expect(
      extractCheckoutRedirectTarget({
        data: {
          checkoutUrl: "/checkout/simulate?orderId=order_123",
        },
      }),
    ).toEqual({
      checkoutUrl: "/checkout/simulate?orderId=order_123",
      isExternal: false,
    });
  });

  test("returns an external redirect target for an absolute checkoutUrl in the payload", () => {
    expect(
      extractCheckoutRedirectTarget({
        data: {
          checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_123",
        },
      }),
    ).toEqual({
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_123",
      isExternal: true,
    });
  });

  test("returns null when checkoutUrl is missing or malformed", () => {
    expect(extractCheckoutRedirectTarget({ data: { checkoutUrl: 123 } })).toBeNull();
    expect(extractCheckoutRedirectTarget({ data: {} })).toBeNull();
    expect(extractCheckoutRedirectTarget(null)).toBeNull();
  });
});
