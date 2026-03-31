import { expect, test, vi } from "vitest";

import { createAuthorizationError } from "../../../../../src/server/application/errors";
import { createCreateLotHandler } from "../../../../../src/server/api/lots/create-lot.handler";

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const ORGANIZER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";

test("returns 400 validation error for invalid payload", async () => {
  const createLot = vi.fn();

  const handler = createCreateLotHandler({
    createLot,
  });

  const response = await handler({
    actor: {
      role: "organizer",
      userId: ORGANIZER_ID,
    },
    body: {
      eventId: "invalid-uuid",
    },
  });

  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("validation");
  expect(createLot).not.toHaveBeenCalled();
});

test("delegates parsed input and actor context to createLot use-case", async () => {
  const createLot = vi.fn(async () => ({
    lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
    eventId: EVENT_ID,
    status: "active" as const,
    availableQuantity: 50,
  }));

  const handler = createCreateLotHandler({
    createLot,
  });

  const response = await handler({
    actor: {
      role: "organizer",
      userId: ORGANIZER_ID,
    },
    body: {
      eventId: EVENT_ID,
      title: "  VIP  ",
      priceInCents: 25000,
      totalQuantity: 50,
      maxPerOrder: 2,
      saleStartsAt: "2027-01-01T10:00:00.000Z",
      saleEndsAt: "2027-01-10T22:00:00.000Z",
    },
  });

  expect(response.status).toBe(201);
  expect(createLot).toHaveBeenCalledWith({
    eventId: EVENT_ID,
    title: "VIP",
    priceInCents: 25000,
    totalQuantity: 50,
    maxPerOrder: 2,
    saleStartsAt: new Date("2027-01-01T10:00:00.000Z"),
    saleEndsAt: new Date("2027-01-10T22:00:00.000Z"),
    actor: {
      role: "organizer",
      userId: ORGANIZER_ID,
    },
  });
});

test("maps use-case authorization errors with stable response shape", async () => {
  const createLot = vi.fn(async () => {
    throw createAuthorizationError("Forbidden");
  });

  const handler = createCreateLotHandler({
    createLot,
  });

  const response = await handler({
    actor: {
      role: "organizer",
      userId: ORGANIZER_ID,
    },
    body: {
      eventId: EVENT_ID,
      title: "VIP",
      priceInCents: 25000,
      totalQuantity: 50,
      maxPerOrder: 2,
      saleStartsAt: "2027-01-01T10:00:00.000Z",
      saleEndsAt: "2027-01-10T22:00:00.000Z",
    },
  });

  expect(response.status).toBe(403);
  expect(response.body.error.code).toBe("authorization");
});
