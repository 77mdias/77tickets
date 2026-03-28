import { expect, test } from "vitest";

import { createCreateOrderHandler } from "../../../../src/server/api/create-order.handler";
import type { SecurityActor } from "../../../../src/server/application/security";
import type { CreateOrderInput } from "../../../../src/server/application/use-cases/create-order.use-case";
import { PersistenceError } from "../../../../src/server/repositories";

const AUTHENTICATED_CUSTOMER: SecurityActor = {
  role: "customer",
  userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
};

test("createCreateOrderHandler returns validation error response for invalid payload", async () => {
  let createOrderCalls = 0;

  const handler = createCreateOrderHandler({
    createOrder: async () => {
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

  const response = await handler({
    actor: AUTHENTICATED_CUSTOMER,
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

test("createCreateOrderHandler passes validated typed input to use-case", async () => {
  let receivedInput: CreateOrderInput | undefined;

  const handler = createCreateOrderHandler({
    createOrder: async (input) => {
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

  const response = await handler({
    actor: AUTHENTICATED_CUSTOMER,
    body: payload,
  });

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

test("createCreateOrderHandler maps repository persistence conflicts to 409", async () => {
  const handler = createCreateOrderHandler({
    createOrder: async () => {
      throw new PersistenceError(
        "unique-constraint",
        "Persistence operation failed: create order.",
        { constraint: "orders_event_id_customer_id_unique" },
      );
    },
  });

  const response = await handler({
    actor: AUTHENTICATED_CUSTOMER,
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

test("createCreateOrderHandler maps unknown persistence failures to 500", async () => {
  const handler = createCreateOrderHandler({
    createOrder: async () => {
      throw new PersistenceError(
        "unknown",
        "Persistence operation failed: create order.",
      );
    },
  });

  const response = await handler({
    actor: AUTHENTICATED_CUSTOMER,
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

test("createCreateOrderHandler logs unauthorized create-order attempts for audit", async () => {
  const actor: SecurityActor = {
    role: "customer",
    userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
  };
  const auditCalls: Array<{
    actorId: string;
    actorRole: SecurityActor["role"];
    targetCustomerId: string;
    eventId: string;
  }> = [];

  const handler = createCreateOrderHandler({
    createOrder: async () => {
      throw new Error("createOrder should not be called for unauthorized actor");
    },
    auditLogger: {
      logUnauthorizedCreateOrderAttempt: async (entry) => {
        auditCalls.push(entry);
      },
    },
  });

  const response = await handler({
    actor,
    body: {
      eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
      customerId: "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9",
      items: [
        {
          lotId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
          quantity: 1,
        },
      ],
    },
  });

  expect(response.status).toBe(403);
  expect(response.body.error.code).toBe("authorization");
  expect(auditCalls).toEqual([
    {
      actorId: actor.userId,
      actorRole: actor.role,
      targetCustomerId: "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9",
      eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    },
  ]);
});

test("createCreateOrderHandler tracks checkout telemetry for successful requests", async () => {
  const telemetryCalls: Array<Record<string, unknown>> = [];
  const nowMsValues = [10, 65];

  const handler = createCreateOrderHandler({
    createOrder: async () => ({
      orderId: "order_telemetry_success",
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
    }),
    observability: {
      trackCheckoutAttempt: async (entry) => {
        telemetryCalls.push(entry as Record<string, unknown>);
      },
    },
    now: () => new Date("2026-03-28T16:00:00.000Z"),
    nowMs: () => nowMsValues.shift() ?? 65,
  });

  await handler({
    actor: AUTHENTICATED_CUSTOMER,
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

  expect(telemetryCalls).toHaveLength(1);
  expect(telemetryCalls[0]).toMatchObject({
    event: "checkout.create_order",
    outcome: "success",
    status: 200,
    errorCode: null,
    latencyMs: 55,
    actorRole: "customer",
    eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
    itemsCount: 1,
    couponApplied: false,
    timestamp: "2026-03-28T16:00:00.000Z",
  });
});

test("createCreateOrderHandler tracks validation failures without sensitive payload fields", async () => {
  const telemetryCalls: Array<Record<string, unknown>> = [];
  const nowMsValues = [100, 112];

  const handler = createCreateOrderHandler({
    createOrder: async () => {
      throw new Error("createOrder should not be called for invalid payload");
    },
    observability: {
      trackCheckoutAttempt: async (entry) => {
        telemetryCalls.push(entry as Record<string, unknown>);
      },
    },
    now: () => new Date("2026-03-28T16:10:00.000Z"),
    nowMs: () => nowMsValues.shift() ?? 112,
  });

  const response = await handler({
    actor: AUTHENTICATED_CUSTOMER,
    body: {
      eventId: "invalid-uuid",
      customerId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
      items: [],
    },
  });

  expect(response.status).toBe(400);
  expect(telemetryCalls).toHaveLength(1);
  expect(telemetryCalls[0]).toMatchObject({
    event: "checkout.create_order",
    outcome: "failure",
    status: 400,
    errorCode: "validation",
    latencyMs: 12,
    actorRole: "customer",
    eventId: null,
    itemsCount: null,
    couponApplied: null,
    timestamp: "2026-03-28T16:10:00.000Z",
  });
  expect(telemetryCalls[0]).not.toHaveProperty("customerId");
  expect(telemetryCalls[0]).not.toHaveProperty("requestBody");
});
