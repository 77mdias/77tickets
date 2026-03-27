import { expect, test } from "vitest";

import { createOrderSchema } from "../../../../../src/server/api/schemas";

test("createOrderSchema rejects payload with unknown fields at the handler boundary", () => {
  const result = createOrderSchema.safeParse({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    customerId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
    items: [
      {
        lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
        quantity: 2,
      },
    ],
    clientTotalInCents: 1,
  });

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected createOrderSchema to reject unknown fields");
  }

  expect(result.error.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "unrecognized_keys",
        keys: ["clientTotalInCents"],
      }),
    ]),
  );
});

test("createOrderSchema requires items payload used to generate tickets", () => {
  const result = createOrderSchema.safeParse({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    customerId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
    items: [],
  });

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected createOrderSchema to reject empty items");
  }

  expect(result.error.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "too_small",
        path: ["items"],
      }),
    ]),
  );
});
