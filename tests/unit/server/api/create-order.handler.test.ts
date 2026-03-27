import { expect, test } from "vitest";

import { createCreateOrderHandler } from "../../../../src/server/api/create-order.handler";
import type { CreateOrderInput } from "../../../../src/server/application/use-cases/create-order.use-case";
import { PersistenceError } from "../../../../src/server/repositories";

test("createCreateOrderHandler returns validation error response for invalid payload", () => {
  let createOrderCalls = 0;

  const handler = createCreateOrderHandler({
    createOrder: () => {
      createOrderCalls += 1;

      return {
        orderId: "order_123",
        eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
        quantity: 1,
        status: "pending",
      };
    },
  });

  const response = handler({
    body: {
      eventId: "not-uuid",
      quantity: 0,
    },
  });

  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("validation");
  expect(Array.isArray(response.body.error.details?.issues)).toBe(true);
  expect(createOrderCalls).toBe(0);
});

test("createCreateOrderHandler passes validated typed input to use-case", () => {
  let receivedInput: CreateOrderInput | undefined;

  const handler = createCreateOrderHandler({
    createOrder: (input) => {
      receivedInput = input;

      return {
        orderId: "order_123",
        eventId: input.eventId,
        quantity: input.quantity,
        status: "pending",
      };
    },
  });

  const payload = {
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    quantity: 2,
  };

  const response = handler({ body: payload });

  expect(response.status).toBe(200);

  if (response.status !== 200) {
    return;
  }

  expect(receivedInput).toEqual(payload);
  expect(response.body.data).toEqual({
    orderId: "order_123",
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    quantity: 2,
    status: "pending",
  });
});

test("createCreateOrderHandler maps repository persistence conflicts to 409", () => {
  const handler = createCreateOrderHandler({
    createOrder: () => {
      throw new PersistenceError(
        "unique-constraint",
        "Persistence operation failed: create order.",
        { constraint: "orders_event_id_customer_id_unique" },
      );
    },
  });

  const response = handler({
    body: {
      eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
      quantity: 1,
    },
  });

  expect(response.status).toBe(409);
  expect(response.body.error.code).toBe("conflict");
  expect(response.body.error.message).toBe("Persistence conflict");
  expect(response.body.error.details).toEqual({
    kind: "unique-constraint",
    constraint: "orders_event_id_customer_id_unique",
  });
});

test("createCreateOrderHandler maps unknown persistence failures to 500", () => {
  const handler = createCreateOrderHandler({
    createOrder: () => {
      throw new PersistenceError(
        "unknown",
        "Persistence operation failed: create order.",
      );
    },
  });

  const response = handler({
    body: {
      eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
      quantity: 1,
    },
  });

  expect(response.status).toBe(500);
  expect(response.body.error.code).toBe("internal");
  expect(response.body.error.message).toBe("Persistence failure");
  expect(response.body.error.details).toEqual({
    kind: "unknown",
  });
});
