import { expect, test } from "vitest";

import { updateEventSchema } from "../../../../../src/server/api/schemas";

test("updateEventSchema rejects payload with missing required fields", () => {
  const result = updateEventSchema.safeParse({});

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected updateEventSchema to reject missing fields");
  }

  expect(result.error.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: ["eventId"] }),
      expect.objectContaining({ path: ["targetStatus"] }),
    ]),
  );
});

test("updateEventSchema rejects non-UUID eventId", () => {
  const result = updateEventSchema.safeParse({
    eventId: "not-a-uuid",
    targetStatus: "cancelled",
  });

  expect(result.success).toBe(false);
});

test("updateEventSchema rejects unknown targetStatus", () => {
  const result = updateEventSchema.safeParse({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    targetStatus: "archived",
  });

  expect(result.success).toBe(false);
});

test("updateEventSchema accepts valid status payload", () => {
  const result = updateEventSchema.safeParse({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    targetStatus: "cancelled",
  });

  expect(result.success).toBe(true);

  if (!result.success) {
    throw new Error("Expected updateEventSchema to accept valid payload");
  }

  expect(result.data).toEqual({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    targetStatus: "cancelled",
  });
});
