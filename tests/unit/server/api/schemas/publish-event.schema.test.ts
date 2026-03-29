import { expect, test } from "vitest";

import { publishEventSchema } from "../../../../../src/server/api/schemas";

test("publishEventSchema rejects payload with missing eventId", () => {
  const result = publishEventSchema.safeParse({});

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected publishEventSchema to reject missing eventId");
  }

  expect(result.error.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "invalid_type",
        path: ["eventId"],
      }),
    ]),
  );
});

test("publishEventSchema rejects non-UUID eventId", () => {
  const result = publishEventSchema.safeParse({ eventId: "not-a-uuid" });

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected publishEventSchema to reject non-UUID eventId");
  }

  expect(result.error.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        path: ["eventId"],
      }),
    ]),
  );
});

test("publishEventSchema rejects unknown fields at the handler boundary", () => {
  const result = publishEventSchema.safeParse({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    organizerId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
  });

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected publishEventSchema to reject unknown fields");
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

test("publishEventSchema accepts a valid publish-event payload", () => {
  const result = publishEventSchema.safeParse({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
  });

  expect(result.success).toBe(true);

  if (!result.success) {
    throw new Error("Expected publishEventSchema to accept valid payload");
  }

  expect(result.data).toEqual({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
  });
});
