import { and, eq } from "drizzle-orm";

import type { Db } from "../../infrastructure/db/client";
import { orders, tickets } from "../../infrastructure/db/schema";
import type { EntityId } from "../common.repository.contracts";
import type {
  NewTicketData,
  TicketRecord,
  TicketRepository,
} from "../ticket.repository.contracts";
import { mapPersistenceError } from "./map-persistence-error";

export class DrizzleTicketRepository implements TicketRepository {
  constructor(private readonly db: Db) {}

  async createMany(newTickets: NewTicketData[]): Promise<TicketRecord[]> {
    if (newTickets.length === 0) return [];

    try {
      const inserted = await this.db
        .insert(tickets)
        .values(newTickets)
        .returning();

      return inserted.map(toTicketRecord);
    } catch (error) {
      throw mapPersistenceError(error, "create tickets");
    }
  }

  async findByCode(code: string): Promise<TicketRecord | null> {
    const [row] = await this.db
      .select()
      .from(tickets)
      .where(eq(tickets.code, code))
      .limit(1);

    return row ? toTicketRecord(row) : null;
  }

  async listByOrderId(orderId: EntityId): Promise<TicketRecord[]> {
    const rows = await this.db
      .select()
      .from(tickets)
      .where(eq(tickets.orderId, orderId));

    return rows.map(toTicketRecord);
  }

  async listByCustomerId(customerId: EntityId): Promise<TicketRecord[]> {
    const rows = await this.db
      .select({
        id: tickets.id,
        eventId: tickets.eventId,
        orderId: tickets.orderId,
        lotId: tickets.lotId,
        code: tickets.code,
        status: tickets.status,
        checkedInAt: tickets.checkedInAt,
      })
      .from(tickets)
      .innerJoin(orders, eq(orders.id, tickets.orderId))
      .where(eq(orders.customerId, customerId))
      .orderBy(tickets.code);

    return rows.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      orderId: row.orderId,
      lotId: row.lotId,
      code: row.code,
      status: row.status,
      checkedInAt: row.checkedInAt,
    }));
  }

  async markAsUsedIfActive(
    ticketId: EntityId,
    checkedInAt: Date,
  ): Promise<boolean> {
    try {
      const updatedRows = await this.db
        .update(tickets)
        .set({ status: "used", checkedInAt })
        .where(and(eq(tickets.id, ticketId), eq(tickets.status, "active")))
        .returning({ id: tickets.id });

      return updatedRows.length > 0;
    } catch (error) {
      throw mapPersistenceError(error, "mark ticket as used");
    }
  }
}

function toTicketRecord(row: typeof tickets.$inferSelect): TicketRecord {
  return {
    id: row.id,
    eventId: row.eventId,
    orderId: row.orderId,
    lotId: row.lotId,
    code: row.code,
    status: row.status,
    checkedInAt: row.checkedInAt,
  };
}
