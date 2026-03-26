import type { EntityId } from "./common.repository.contracts";

export type TicketStatus = "active" | "used" | "cancelled";

export interface TicketRecord {
  id: EntityId;
  eventId: EntityId;
  orderId: EntityId;
  code: string;
  status: TicketStatus;
  checkedInAt: Date | null;
}

export interface TicketRepository {
  findByCode(code: string): Promise<TicketRecord | null>;
  listByOrderId(orderId: EntityId): Promise<TicketRecord[]>;
  markAsUsed(ticketId: EntityId, checkedInAt: Date): Promise<void>;
}
