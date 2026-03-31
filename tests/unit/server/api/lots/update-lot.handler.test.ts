import { expect, test, vi } from "vitest";

import { createConflictError } from "../../../../../src/server/application/errors";
import { createUpdateLotHandler } from "../../../../../src/server/api/lots/update-lot.handler";

const LOT_ID = "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e";
const ORGANIZER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";

test("returns 400 validation error for invalid payload", async () => {
  const updateLot = vi.fn();

  const handler = createUpdateLotHandler({
    updateLot,
  });

  const response = await handler({
    actor: {
      role: "organizer",
      userId: ORGANIZER_ID,
    },
    body: {
      lotId: "invalid-uuid",
      title: "VIP Updated",
    },
  });

  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("validation");
  expect(updateLot).not.toHaveBeenCalled();
});

test("delegates parsed input and actor context to updateLot use-case", async () => {
  const updateLot = vi.fn(async () => ({
    lotId: LOT_ID,
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    totalQuantity: 40,
    availableQuantity: 20,
    status: "paused" as const,
  }));

  const handler = createUpdateLotHandler({
    updateLot,
  });

  const response = await handler({
    actor: {
      role: "admin",
      userId: "00000000-0000-0000-0000-000000000099",
    },
    body: {
      lotId: LOT_ID,
      title: "  VIP Updated  ",
      priceInCents: 30000,
      totalQuantity: 40,
      maxPerOrder: 2,
      saleStartsAt: "2027-01-01T10:00:00.000Z",
      saleEndsAt: "2027-01-10T22:00:00.000Z",
      status: "paused",
    },
  });

  expect(response.status).toBe(200);
  expect(updateLot).toHaveBeenCalledWith({
    lotId: LOT_ID,
    title: "VIP Updated",
    priceInCents: 30000,
    totalQuantity: 40,
    maxPerOrder: 2,
    saleStartsAt: new Date("2027-01-01T10:00:00.000Z"),
    saleEndsAt: new Date("2027-01-10T22:00:00.000Z"),
    status: "paused",
    actor: {
      role: "admin",
      userId: "00000000-0000-0000-0000-000000000099",
    },
  });
});

test("maps use-case conflicts with stable response shape", async () => {
  const updateLot = vi.fn(async () => {
    throw createConflictError("Update lot conflict", {
      details: { reason: "total_quantity_below_sold_quantity" },
    });
  });

  const handler = createUpdateLotHandler({
    updateLot,
  });

  const response = await handler({
    actor: {
      role: "organizer",
      userId: ORGANIZER_ID,
    },
    body: {
      lotId: LOT_ID,
      title: "VIP Updated",
      priceInCents: 30000,
      totalQuantity: 40,
      maxPerOrder: 2,
      saleStartsAt: "2027-01-01T10:00:00.000Z",
      saleEndsAt: "2027-01-10T22:00:00.000Z",
      status: "paused",
    },
  });

  expect(response.status).toBe(409);
  expect(response.body.error.code).toBe("conflict");
  expect(response.body.error.details).toEqual({
    reason: "total_quantity_below_sold_quantity",
  });
});
