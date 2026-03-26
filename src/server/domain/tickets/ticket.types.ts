import type { EntityId } from "../shared.types";

export type TicketStatus = "active" | "used" | "cancelled";

export interface Ticket {
  id: EntityId;
  eventId: EntityId;
  orderId: EntityId;
  lotId: EntityId;
  code: string;
  status: TicketStatus;
  checkedInAt: Date | null;
}
