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
        customerId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
        status: "pending",
        subtotalInCents: 10000,
        discountInCents: 0,
        totalInCents: 10000,
        items: [
          {
            lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
            quantity: 1,
            unitPriceInCents: 10000,
          },
        ],
      };
    },
  });

  const response = handler({
    body: {
      eventId: "not-uuid",
      customerId: "not-uuid",
      items: [],
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
        customerId: input.customerId,
        status: "pending",
        subtotalInCents: 20000,
        discountInCents: 2000,
        totalInCents: 18000,
        items: [
          {
            lotId: input.items[0].lotId,
            quantity: input.items[0].quantity,
            unitPriceInCents: 10000,
          },
        ],
      };
    },
  });

  const payload = {
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    customerId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
    items: [
      {
        lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
        quantity: 2,
      },
    ],
    couponCode: "EARLYBIRD10",
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
    customerId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
    status: "pending",
    subtotalInCents: 20000,
    discountInCents: 2000,
    totalInCents: 18000,
    items: [
      {
        lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
        quantity: 2,
        unitPriceInCents: 10000,
      },
    ],
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
      customerId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
      items: [
        {
          lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
          quantity: 1,
        },
      ],
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
      customerId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
      items: [
        {
          lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
          quantity: 1,
        },
      ],
    },
  });

  expect(response.status).toBe(500);
  expect(response.body.error.code).toBe("internal");
  expect(response.body.error.message).toBe("Persistence failure");
  expect(response.body.error.details).toEqual({
    kind: "unknown",
  });
});
