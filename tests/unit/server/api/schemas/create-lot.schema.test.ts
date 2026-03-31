import { expect, test } from "vitest";

import { createLotSchema } from "../../../../../src/server/api/schemas";

test("createLotSchema rejects payload with missing required fields", () => {
  const result = createLotSchema.safeParse({});

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected createLotSchema to reject missing fields");
  }

  expect(result.error.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: ["eventId"] }),
      expect.objectContaining({ path: ["title"] }),
      expect.objectContaining({ path: ["priceInCents"] }),
      expect.objectContaining({ path: ["totalQuantity"] }),
      expect.objectContaining({ path: ["maxPerOrder"] }),
      expect.objectContaining({ path: ["saleStartsAt"] }),
    ]),
  );
});

test("createLotSchema rejects unknown fields at the boundary", () => {
  const result = createLotSchema.safeParse({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    title: "VIP",
    priceInCents: 25000,
    totalQuantity: 50,
    maxPerOrder: 2,
    saleStartsAt: "2027-01-01T10:00:00.000Z",
    saleEndsAt: "2027-01-10T22:00:00.000Z",
    availableQuantity: 50,
  });

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected createLotSchema to reject unknown fields");
  }

  expect(result.error.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "unrecognized_keys",
        keys: ["availableQuantity"],
      }),
    ]),
  );
});

test("createLotSchema accepts valid payload and parses dates", () => {
  const result = createLotSchema.safeParse({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    title: "  VIP  ",
    priceInCents: 25000,
    totalQuantity: 50,
    maxPerOrder: 2,
    saleStartsAt: "2027-01-01T10:00:00.000Z",
    saleEndsAt: "2027-01-10T22:00:00.000Z",
  });

  expect(result.success).toBe(true);

  if (!result.success) {
    throw new Error("Expected createLotSchema to accept valid payload");
  }

  expect(result.data).toMatchObject({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    title: "VIP",
    priceInCents: 25000,
    totalQuantity: 50,
    maxPerOrder: 2,
  });
  expect(result.data.saleStartsAt).toBeInstanceOf(Date);
  expect(result.data.saleEndsAt).toBeInstanceOf(Date);
});
