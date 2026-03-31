import { expect, test } from "vitest";

import { updateLotSchema } from "../../../../../src/server/api/schemas";

test("updateLotSchema rejects payload with missing required fields", () => {
  const result = updateLotSchema.safeParse({});

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected updateLotSchema to reject missing fields");
  }

  expect(result.error.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: ["lotId"] }),
      expect.objectContaining({ path: ["title"] }),
      expect.objectContaining({ path: ["priceInCents"] }),
      expect.objectContaining({ path: ["totalQuantity"] }),
      expect.objectContaining({ path: ["maxPerOrder"] }),
      expect.objectContaining({ path: ["saleStartsAt"] }),
      expect.objectContaining({ path: ["status"] }),
    ]),
  );
});

test("updateLotSchema rejects unknown fields at the boundary", () => {
  const result = updateLotSchema.safeParse({
    lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
    title: "VIP Updated",
    priceInCents: 30000,
    totalQuantity: 40,
    maxPerOrder: 2,
    saleStartsAt: "2027-01-01T10:00:00.000Z",
    saleEndsAt: "2027-01-10T22:00:00.000Z",
    status: "paused",
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
  });

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected updateLotSchema to reject unknown fields");
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

test("updateLotSchema accepts valid payload and parses dates", () => {
  const result = updateLotSchema.safeParse({
    lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
    title: "  VIP Updated  ",
    priceInCents: 30000,
    totalQuantity: 40,
    maxPerOrder: 2,
    saleStartsAt: "2027-01-01T10:00:00.000Z",
    saleEndsAt: "2027-01-10T22:00:00.000Z",
    status: "paused",
  });

  expect(result.success).toBe(true);

  if (!result.success) {
    throw new Error("Expected updateLotSchema to accept valid payload");
  }

  expect(result.data).toMatchObject({
    lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
    title: "VIP Updated",
    priceInCents: 30000,
    totalQuantity: 40,
    maxPerOrder: 2,
    status: "paused",
  });
  expect(result.data.saleStartsAt).toBeInstanceOf(Date);
  expect(result.data.saleEndsAt).toBeInstanceOf(Date);
});
