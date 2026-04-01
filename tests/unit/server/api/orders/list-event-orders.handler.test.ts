import { expect, test, vi } from "vitest";

import { createAuthorizationError } from "../../../../../src/server/application/errors";
import { createListEventOrdersHandler } from "../../../../../src/server/api/orders/list-event-orders.handler";

const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const ORGANIZER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";

test("returns 400 validation error for invalid params", async () => {
  const listEventOrders = vi.fn();

  const handler = createListEventOrdersHandler({
    listEventOrders,
  });

  const response = await handler({
    actor: {
      role: "organizer",
      userId: ORGANIZER_ID,
    },
    params: {
      eventId: "",
    },
  });

  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("validation");
  expect(listEventOrders).not.toHaveBeenCalled();
});

test("accepts event slug as identifier", async () => {
  const listEventOrders = vi.fn(async () => ({
    eventId: EVENT_ID,
    orders: [],
  }));

  const handler = createListEventOrdersHandler({
    listEventOrders,
  });

  const response = await handler({
    actor: {
      role: "admin",
      userId: "00000000-0000-0000-0000-000000000099",
    },
    params: {
      eventId: "festival-de-verao-2027",
    },
  });

  expect(response.status).toBe(200);
  expect(listEventOrders).toHaveBeenCalledWith({
    eventId: "festival-de-verao-2027",
    actor: {
      role: "admin",
      userId: "00000000-0000-0000-0000-000000000099",
    },
  });
});

test("delegates parsed input and actor context to listEventOrders use-case", async () => {
  const listEventOrders = vi.fn(async () => ({
    eventId: EVENT_ID,
    orders: [],
  }));

  const handler = createListEventOrdersHandler({
    listEventOrders,
  });

  const response = await handler({
    actor: {
      role: "admin",
      userId: "00000000-0000-0000-0000-000000000099",
    },
    params: {
      eventId: EVENT_ID,
    },
  });

  expect(response.status).toBe(200);
  expect(listEventOrders).toHaveBeenCalledWith({
    eventId: EVENT_ID,
    actor: {
      role: "admin",
      userId: "00000000-0000-0000-0000-000000000099",
    },
  });
});

test("maps use-case authorization errors with stable response shape", async () => {
  const listEventOrders = vi.fn(async () => {
    throw createAuthorizationError("Forbidden");
  });

  const handler = createListEventOrdersHandler({
    listEventOrders,
  });

  const response = await handler({
    actor: {
      role: "organizer",
      userId: ORGANIZER_ID,
    },
    params: {
      eventId: EVENT_ID,
    },
  });

  expect(response.status).toBe(403);
  expect(response.body.error.code).toBe("authorization");
});
