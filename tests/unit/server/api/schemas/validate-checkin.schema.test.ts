import { expect, test } from "vitest";

import { validateCheckinSchema } from "../../../../../src/server/api/schemas";

test("validateCheckinSchema accepts valid payload", () => {
  const result = validateCheckinSchema.safeParse({
    ticketId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    eventId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
  });

  expect(result.success).toBe(true);
});

test("validateCheckinSchema rejects invalid payload fields", () => {
  const result = validateCheckinSchema.safeParse({
    ticketId: "invalid-ticket-id",
    eventId: "invalid-event-id",
  });

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected validateCheckinSchema to reject invalid UUIDs");
  }

  expect(result.error.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "invalid_format",
        path: ["ticketId"],
      }),
      expect.objectContaining({
        code: "invalid_format",
        path: ["eventId"],
      }),
    ]),
  );
});

test("validateCheckinSchema rejects unknown fields at handler boundary", () => {
  const result = validateCheckinSchema.safeParse({
    ticketId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    eventId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
    checkerId: "3f124f71-9e98-4cb3-a91a-b0666fb5de04",
  });

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected validateCheckinSchema to reject unknown fields");
  }

  expect(result.error.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "unrecognized_keys",
        keys: ["checkerId"],
      }),
    ]),
  );
});
