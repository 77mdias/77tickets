import { describe, expect, test } from "vitest";

import { createGetCustomerOrdersHandler } from "../../../../src/server/api/orders/get-customer-orders.handler";
import type { SecurityActor } from "../../../../src/server/application/security";
import { createGetCustomerOrdersUseCase } from "../../../../src/server/application/use-cases";
import { DrizzleOrderRepository, DrizzleTicketRepository } from "../../../../src/server/repositories/drizzle";
import {
  createEventFixture,
  createLotFixture,
  createOrderFixture,
  createTicketFixture,
} from "../../../fixtures";
import { cleanDatabase, createTestDb, TEST_USER_IDS } from "../../setup";

describe.skipIf(!process.env.TEST_DATABASE_URL)("orders mine endpoint integration", () => {
  const db = createTestDb();

  const createHandler = () =>
    createGetCustomerOrdersHandler({
      getCustomerOrders: createGetCustomerOrdersUseCase({
        orderRepository: new DrizzleOrderRepository(db),
        ticketRepository: new DrizzleTicketRepository(db),
      }),
    });

  test("GET /api/orders/mine returns only authenticated customer orders with ticket tokens", async () => {
    await cleanDatabase(db);

    const event = await createEventFixture(db, { status: "published" });
    const lot = await createLotFixture(db, event.id);

    const customerAOrder = await createOrderFixture(db, event.id, {
      customerId: TEST_USER_IDS.customerA,
      status: "paid",
    });
    const customerBOrder = await createOrderFixture(db, event.id, {
      customerId: TEST_USER_IDS.customerB,
      status: "paid",
    });

    await createTicketFixture(
      db,
      { eventId: event.id, orderId: customerAOrder.id, lotId: lot.id },
      { code: "MINE-TKT-A-001" },
    );
    await createTicketFixture(
      db,
      { eventId: event.id, orderId: customerBOrder.id, lotId: lot.id },
      { code: "MINE-TKT-B-001" },
    );

    const handler = createHandler();
    const response = await handler({
      actor: {
        role: "customer",
        userId: TEST_USER_IDS.customerA,
      },
    });

    expect(response.status).toBe(200);
    if (response.status !== 200) return;

    expect(response.body.data.orders).toHaveLength(1);
    expect(response.body.data.orders[0].id).toBe(customerAOrder.id);
    expect(response.body.data.orders[0].tickets.map((ticket) => ticket.token)).toEqual([
      "MINE-TKT-A-001",
    ]);
  });

  test("GET /api/orders/mine blocks checker role", async () => {
    await cleanDatabase(db);

    const handler = createHandler();
    const response = await handler({
      actor: {
        role: "checker",
        userId: TEST_USER_IDS.checker,
      } as SecurityActor,
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("authorization");
  });
});
