import { eq } from "drizzle-orm";

import type { Db } from "../../infrastructure/db/client";
import { tickets } from "../../infrastructure/db/schema";
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

  async markAsUsed(ticketId: EntityId, checkedInAt: Date): Promise<void> {
    try {
      await this.db
        .update(tickets)
        .set({ status: "used", checkedInAt })
        .where(eq(tickets.id, ticketId));
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
