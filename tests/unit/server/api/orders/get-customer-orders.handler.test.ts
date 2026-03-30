import { expect, test, vi } from "vitest";

import type { SecurityActor } from "../../../../../src/server/application/security";
import { createGetCustomerOrdersHandler } from "../../../../../src/server/api/orders/get-customer-orders.handler";

const CUSTOMER_ACTOR: SecurityActor = {
  role: "customer",
  userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
};

test("ORD-007 RED: returns customer orders from authenticated actor context", async () => {
  const getCustomerOrders = vi.fn(async () => ({ orders: [] }));

  const handler = createGetCustomerOrdersHandler({ getCustomerOrders });
  const response = await handler({ actor: CUSTOMER_ACTOR });

  expect(response.status).toBe(200);
  expect(getCustomerOrders).toHaveBeenCalledWith({ customerId: CUSTOMER_ACTOR.userId });
});

test("ORD-007 RED: blocks non-customer/non-admin actors", async () => {
  const handler = createGetCustomerOrdersHandler({
    getCustomerOrders: async () => ({ orders: [] }),
  });

  const response = await handler({
    actor: { role: "checker", userId: "00000000-0000-0000-0000-000000000011" },
  });

  expect(response.status).toBe(403);
  expect(response.body.error.code).toBe("authorization");
});
