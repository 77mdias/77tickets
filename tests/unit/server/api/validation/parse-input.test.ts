import { z } from "zod";
import { expect, test } from "vitest";

import { isAppError } from "../../../../../src/server/application/errors/index";
import { parseInput } from "../../../../../src/server/api/validation/parse-input";

const purchaseSchema = z.object({
  eventId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

test("parseInput returns typed data for valid payload", () => {
  const result = parseInput(purchaseSchema, {
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    quantity: 2,
  });

  expect(result).toEqual({
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    quantity: 2,
  });
});

test("parseInput throws structured validation error for invalid payload", () => {
  try {
    parseInput(purchaseSchema, {
      eventId: "invalid",
      quantity: 0,
    });
  } catch (error) {
    expect(isAppError(error)).toBe(true);

    if (!isAppError(error)) {
      throw error;
    }

    expect(error.code).toBe("validation");
    expect(error.message).toBe("Invalid request payload");
    expect(Array.isArray(error.details?.issues)).toBe(true);
    expect((error.details?.issues as unknown[]).length).toBe(2);
    return;
  }

  throw new Error("Expected parseInput to throw validation error");
});
