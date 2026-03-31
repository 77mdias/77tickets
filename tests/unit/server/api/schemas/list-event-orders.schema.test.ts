import { expect, test } from "vitest";

import { listEventOrdersSchema } from "../../../../../src/server/api/schemas";

test("listEventOrdersSchema rejects missing eventId", () => {
  const result = listEventOrdersSchema.safeParse({});

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected listEventOrdersSchema to reject missing eventId");
  }

  expect(result.error.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: ["eventId"] }),
    ]),
  );
});

test("listEventOrdersSchema rejects unknown fields", () => {
  const result = listEventOrdersSchema.safeParse({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    organizerId: "00000000-0000-0000-0000-000000000001",
  });

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected listEventOrdersSchema to reject unknown fields");
  }

  expect(result.error.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "unrecognized_keys",
        keys: ["organizerId"],
      }),
    ]),
  );
});

test("listEventOrdersSchema accepts valid eventId payload", () => {
  const result = listEventOrdersSchema.safeParse({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
  });

  expect(result.success).toBe(true);

  if (!result.success) {
    throw new Error("Expected listEventOrdersSchema to accept a valid payload");
  }

  expect(result.data).toEqual({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
  });
});
