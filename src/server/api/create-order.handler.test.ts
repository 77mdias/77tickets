import assert from "node:assert/strict";
import test from "node:test";

import { createCreateOrderHandler } from "./create-order.handler";
import type { CreateOrderInput } from "../application/use-cases/create-order.use-case";

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

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "validation");
  assert.equal(Array.isArray(response.body.error.details?.issues), true);
  assert.equal(createOrderCalls, 0);
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

  assert.equal(response.status, 200);

  if (response.status !== 200) {
    return;
  }

  assert.deepStrictEqual(receivedInput, payload);
  assert.deepStrictEqual(response.body.data, {
    orderId: "order_123",
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    quantity: 2,
    status: "pending",
  });
});
