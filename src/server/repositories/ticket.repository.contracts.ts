import type { EntityId } from "./common.repository.contracts";
import type { TicketStatus } from "../domain/tickets";

export type { TicketStatus };

export interface TicketRecord {
  id: EntityId;
  eventId: EntityId;
  orderId: EntityId;
  lotId: EntityId;
  code: string;
  status: TicketStatus;
  checkedInAt: Date | null;
}

export interface NewTicketData {
  eventId: EntityId;
  orderId: EntityId;
  lotId: EntityId;
  code: string;
}

export interface TicketRepository {
  findByCode(code: string): Promise<TicketRecord | null>;
  listByOrderId(orderId: EntityId): Promise<TicketRecord[]>;
  createMany(tickets: NewTicketData[]): Promise<TicketRecord[]>;
  markAsUsedIfActive(ticketId: EntityId, checkedInAt: Date): Promise<boolean>;
}
