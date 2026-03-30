import { describe, expect, test } from "vitest";

import { DrizzleOrderRepository } from "../../../src/server/repositories/drizzle/drizzle-order.repository";
import { DrizzleTicketRepository } from "../../../src/server/repositories/drizzle/drizzle-ticket.repository";
import { cleanDatabase, createTestDb } from "../setup";
import { createEventFixture, createLotFixture, createOrderFixture, createTicketFixture } from "../../fixtures";

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "DrizzleOrderRepository",
  () => {
    const db = createTestDb();

    test("create persists order/items/tickets in a single transaction", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, { status: "published" });
      const lot = await createLotFixture(db, event.id);

      const repo = new DrizzleOrderRepository(db);
      const ticketRepo = new DrizzleTicketRepository(db);

      const orderRecord = {
        id: "00000000-0000-0000-0000-000000000200",
        customerId: "00000000-0000-0000-0000-000000000002",
        eventId: event.id,
        status: "pending" as const,
        subtotalInCents: 20000,
        discountInCents: 0,
        totalInCents: 20000,
        createdAt: new Date(),
      };

      const items = [
        { lotId: lot.id, quantity: 2, unitPriceInCents: 10000 },
      ];
      const tickets = [
        { eventId: event.id, lotId: lot.id, code: "TKT-ORDER-200-001" },
        { eventId: event.id, lotId: lot.id, code: "TKT-ORDER-200-002" },
      ];

      const result = await repo.create(orderRecord, items, tickets);
      const persistedTickets = await ticketRepo.listByOrderId(orderRecord.id);

      expect(result.order.id).toBe(orderRecord.id);
      expect(result.order.customerId).toBe(orderRecord.customerId);
      expect(result.order.status).toBe("pending");
      expect(result.order.totalInCents).toBe(20000);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].lotId).toBe(lot.id);
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[0].unitPriceInCents).toBe(10000);
      expect(persistedTickets).toHaveLength(2);
      expect(persistedTickets.map((ticket) => ticket.code)).toEqual([
        "TKT-ORDER-200-001",
        "TKT-ORDER-200-002",
      ]);
    });

    test("create supports multiple order items", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, { status: "published" });
      const lotA = await createLotFixture(db, event.id, { title: "VIP" });
      const lotB = await createLotFixture(db, event.id, { title: "General" });

      const repo = new DrizzleOrderRepository(db);

      const orderRecord = {
        id: "00000000-0000-0000-0000-000000000201",
        customerId: "00000000-0000-0000-0000-000000000002",
        eventId: event.id,
        status: "pending" as const,
        subtotalInCents: 30000,
        discountInCents: 0,
        totalInCents: 30000,
        createdAt: new Date(),
      };

      const items = [
        { lotId: lotA.id, quantity: 1, unitPriceInCents: 20000 },
        { lotId: lotB.id, quantity: 1, unitPriceInCents: 10000 },
      ];

      const result = await repo.create(orderRecord, items);

      expect(result.items).toHaveLength(2);
    });

    test("findById returns OrderWithItemsRecord for existing order", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, { status: "published" });
      const lot = await createLotFixture(db, event.id);

      const repo = new DrizzleOrderRepository(db);

      const orderRecord = {
        id: "00000000-0000-0000-0000-000000000202",
        customerId: "00000000-0000-0000-0000-000000000002",
        eventId: event.id,
        status: "pending" as const,
        subtotalInCents: 10000,
        discountInCents: 0,
        totalInCents: 10000,
        createdAt: new Date(),
      };

      await repo.create(orderRecord, [
        { lotId: lot.id, quantity: 1, unitPriceInCents: 10000 },
      ]);

      const found = await repo.findById(orderRecord.id);

      expect(found).not.toBeNull();
      expect(found!.order.id).toBe(orderRecord.id);
      expect(found!.items).toHaveLength(1);
      expect(found!.items[0].lotId).toBe(lot.id);
    });

    test("findById returns null for missing order", async () => {
      await cleanDatabase(db);

      const repo = new DrizzleOrderRepository(db);
      const result = await repo.findById("00000000-0000-0000-0000-000000000999");

      expect(result).toBeNull();
    });

    test("updateStatus changes the order status", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, { status: "published" });
      const lot = await createLotFixture(db, event.id);

      const repo = new DrizzleOrderRepository(db);

      const orderRecord = {
        id: "00000000-0000-0000-0000-000000000203",
        customerId: "00000000-0000-0000-0000-000000000002",
        eventId: event.id,
        status: "pending" as const,
        subtotalInCents: 10000,
        discountInCents: 0,
        totalInCents: 10000,
        createdAt: new Date(),
      };

      await repo.create(orderRecord, [
        { lotId: lot.id, quantity: 1, unitPriceInCents: 10000 },
      ]);

      await repo.updateStatus(orderRecord.id, "paid");

      const updated = await repo.findById(orderRecord.id);
      expect(updated!.order.status).toBe("paid");
    });

    test("listByCustomerId returns only orders from the requested customer with their items", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, { status: "published" });
      const lot = await createLotFixture(db, event.id);

      const customerA = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";
      const customerB = "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9";

      const repo = new DrizzleOrderRepository(db);

      await repo.create(
        {
          id: "00000000-0000-0000-0000-000000000206",
          customerId: customerA,
          eventId: event.id,
          status: "pending",
          subtotalInCents: 10000,
          discountInCents: 0,
          totalInCents: 10000,
          createdAt: new Date("2027-06-01T10:00:00.000Z"),
        },
        [{ lotId: lot.id, quantity: 1, unitPriceInCents: 10000 }],
      );

      await repo.create(
        {
          id: "00000000-0000-0000-0000-000000000207",
          customerId: customerB,
          eventId: event.id,
          status: "pending",
          subtotalInCents: 20000,
          discountInCents: 0,
          totalInCents: 20000,
          createdAt: new Date("2027-06-02T10:00:00.000Z"),
        },
        [{ lotId: lot.id, quantity: 2, unitPriceInCents: 10000 }],
      );

      const customerOrders = await repo.listByCustomerId(customerA);

      expect(customerOrders).toHaveLength(1);
      expect(customerOrders[0].order.customerId).toBe(customerA);
      expect(customerOrders[0].items).toEqual([
        { lotId: lot.id, quantity: 1, unitPriceInCents: 10000 },
      ]);
    });

    test("create maps order item FK violations to PersistenceError", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, { status: "published" });
      const repo = new DrizzleOrderRepository(db);

      const orderRecord = {
        id: "00000000-0000-0000-0000-000000000204",
        customerId: "00000000-0000-0000-0000-000000000002",
        eventId: event.id,
        status: "pending" as const,
        subtotalInCents: 10000,
        discountInCents: 0,
        totalInCents: 10000,
        createdAt: new Date(),
      };

      await expect(
        repo.create(orderRecord, [
          {
            lotId: "00000000-0000-0000-0000-000000000999",
            quantity: 1,
            unitPriceInCents: 10000,
          },
        ]),
      ).rejects.toMatchObject({
        name: "PersistenceError",
        kind: "foreign-key-constraint",
      });
    });

    test("create rolls back order and items when ticket insert fails", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, { status: "published" });
      const lot = await createLotFixture(db, event.id);
      const existingOrder = await createOrderFixture(db, event.id, {
        status: "paid",
      });

      await createTicketFixture(
        db,
        { eventId: event.id, orderId: existingOrder.id, lotId: lot.id },
        { code: "TKT-DUPLICATE-ROLLBACK" },
      );

      const repo = new DrizzleOrderRepository(db);

      const orderRecord = {
        id: "00000000-0000-0000-0000-000000000205",
        customerId: "00000000-0000-0000-0000-000000000002",
        eventId: event.id,
        status: "pending" as const,
        subtotalInCents: 10000,
        discountInCents: 0,
        totalInCents: 10000,
        createdAt: new Date(),
      };

      await expect(
        repo.create(
          orderRecord,
          [{ lotId: lot.id, quantity: 1, unitPriceInCents: 10000 }],
          [{ eventId: event.id, lotId: lot.id, code: "TKT-DUPLICATE-ROLLBACK" }],
        ),
      ).rejects.toMatchObject({
        name: "PersistenceError",
        kind: "unique-constraint",
      });

      const orderAfterFailure = await repo.findById(orderRecord.id);
      expect(orderAfterFailure).toBeNull();
    });
  },
);
