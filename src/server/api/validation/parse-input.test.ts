import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import { parseInput } from "./parse-input.ts";
import { isAppError } from "../../application/errors/index.ts";

const purchaseSchema = z.object({
  eventId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

test("parseInput returns typed data for valid payload", () => {
  const result = parseInput(purchaseSchema, {
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    quantity: 2,
  });

  assert.deepStrictEqual(result, {
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    quantity: 2,
  });
});

test("parseInput throws structured validation error for invalid payload", () => {
  assert.throws(
    () => {
      parseInput(purchaseSchema, {
        eventId: "invalid",
        quantity: 0,
      });
    },
    (error: unknown) => {
      assert.equal(isAppError(error), true);

      if (!isAppError(error)) {
        return false;
      }

      assert.equal(error.code, "validation");
      assert.equal(error.message, "Invalid request payload");
      assert.equal(Array.isArray(error.details?.issues), true);
      assert.equal((error.details?.issues as unknown[]).length, 2);

      return true;
    },
  );
});
