import { describe, expect, test } from "vitest";

import { DrizzleTicketRepository } from "../../../src/server/repositories/drizzle/drizzle-ticket.repository";
import { cleanDatabase, createTestDb } from "../setup";
import {
  createEventFixture,
  createLotFixture,
  createOrderFixture,
  createTicketFixture,
} from "../../fixtures";

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "DrizzleTicketRepository",
  () => {
    const db = createTestDb();

    test("createMany inserts tickets and returns TicketRecord[] with DB-assigned ids", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, { status: "published" });
      const lot = await createLotFixture(db, event.id);
      const order = await createOrderFixture(db, event.id, { status: "paid" });

      const repo = new DrizzleTicketRepository(db);

      const result = await repo.createMany([
        { eventId: event.id, orderId: order.id, lotId: lot.id, code: "TKT-A001" },
        { eventId: event.id, orderId: order.id, lotId: lot.id, code: "TKT-A002" },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBeDefined();
      expect(result[0].status).toBe("active");
      expect(result[0].checkedInAt).toBeNull();
      expect(result.map((t) => t.code)).toContain("TKT-A001");
      expect(result.map((t) => t.code)).toContain("TKT-A002");
    });

    test("createMany with empty array returns empty result", async () => {
      await cleanDatabase(db);

      const repo = new DrizzleTicketRepository(db);
      const result = await repo.createMany([]);

      expect(result).toHaveLength(0);
    });

    test("findByCode returns TicketRecord for existing ticket", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, { status: "published" });
      const lot = await createLotFixture(db, event.id);
      const order = await createOrderFixture(db, event.id, { status: "paid" });
      await createTicketFixture(db, { eventId: event.id, orderId: order.id, lotId: lot.id }, { code: "FIND-ME-001" });

      const repo = new DrizzleTicketRepository(db);
      const result = await repo.findByCode("FIND-ME-001");

      expect(result).not.toBeNull();
      expect(result!.code).toBe("FIND-ME-001");
      expect(result!.status).toBe("active");
    });

    test("findByCode returns null for unknown code", async () => {
      await cleanDatabase(db);

      const repo = new DrizzleTicketRepository(db);
      const result = await repo.findByCode("DOES-NOT-EXIST");

      expect(result).toBeNull();
    });

    test("listByOrderId returns all tickets for an order", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, { status: "published" });
      const lot = await createLotFixture(db, event.id);
      const order1 = await createOrderFixture(db, event.id, { status: "paid" });
      const order2 = await createOrderFixture(db, event.id, { status: "paid" });

      await createTicketFixture(db, { eventId: event.id, orderId: order1.id, lotId: lot.id }, { code: "ORD1-T001" });
      await createTicketFixture(db, { eventId: event.id, orderId: order1.id, lotId: lot.id }, { code: "ORD1-T002" });
      await createTicketFixture(db, { eventId: event.id, orderId: order2.id, lotId: lot.id }, { code: "ORD2-T001" });

      const repo = new DrizzleTicketRepository(db);
      const results = await repo.listByOrderId(order1.id);

      expect(results).toHaveLength(2);
      expect(results.every((t) => t.orderId === order1.id)).toBe(true);
    });

    test("markAsUsed sets status to used and records checkedInAt", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, { status: "published" });
      const lot = await createLotFixture(db, event.id);
      const order = await createOrderFixture(db, event.id, { status: "paid" });
      const ticket = await createTicketFixture(db, { eventId: event.id, orderId: order.id, lotId: lot.id }, { code: "MARK-USED-001" });

      const checkedInAt = new Date("2027-06-01T15:30:00Z");

      const repo = new DrizzleTicketRepository(db);
      await repo.markAsUsed(ticket.id, checkedInAt);

      const updated = await repo.findByCode("MARK-USED-001");
      expect(updated!.status).toBe("used");
      expect(updated!.checkedInAt).not.toBeNull();
      expect(updated!.checkedInAt!.toISOString()).toBe(checkedInAt.toISOString());
    });

    test("createMany maps duplicate code constraint to PersistenceError", async () => {
      await cleanDatabase(db);

      const event = await createEventFixture(db, { status: "published" });
      const lot = await createLotFixture(db, event.id);
      const order = await createOrderFixture(db, event.id, { status: "paid" });

      const repo = new DrizzleTicketRepository(db);

      await createTicketFixture(
        db,
        { eventId: event.id, orderId: order.id, lotId: lot.id },
        { code: "TKT-DUPLICATE-001" },
      );

      await expect(
        repo.createMany([
          {
            eventId: event.id,
            orderId: order.id,
            lotId: lot.id,
            code: "TKT-DUPLICATE-001",
          },
        ]),
      ).rejects.toMatchObject({
        name: "PersistenceError",
        kind: "unique-constraint",
        constraint: "tickets_code_unique",
      });
    });
  },
);
