import { expect, test } from "vitest";

import { createOrderSchema } from "../../../../../src/server/api/schemas";

test("createOrderSchema rejects payload with unknown fields at the handler boundary", () => {
  const result = createOrderSchema.safeParse({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    quantity: 2,
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
