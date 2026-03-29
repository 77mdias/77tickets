import { describe, expect, test } from "vitest";

import {
  buildCheckinPayload,
  extractCheckinErrorMessage,
} from "../../../../src/features/checkin/checkin-client";

describe("buildCheckinPayload", () => {
  test("builds payload with trimmed ids and no client-side validity decisions", () => {
    const payload = buildCheckinPayload({
      ticketId: " 4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e ",
      eventId: " 2f180791-a8f5-4cf8-b703-0f220a44f7c8 ",
    });

    expect(payload).toEqual({
      ticketId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
      eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    });
  });
});

describe("extractCheckinErrorMessage", () => {
  test("returns backend error message when present", () => {
    const message = extractCheckinErrorMessage({
      error: {
        code: "conflict",
        message: "Check-in rejected",
      },
    });

    expect(message).toBe("Check-in rejected");
  });

  test("returns fallback for malformed payload", () => {
    expect(extractCheckinErrorMessage(null)).toBe(
      "Could not validate ticket. Please review your input and try again.",
    );
  });
});
