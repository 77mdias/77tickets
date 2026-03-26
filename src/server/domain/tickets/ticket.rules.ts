import type { OrderStatus } from "../orders/order.types";
import type { Ticket } from "./ticket.types";

export type TicketInvalidReason = "ticket_not_active" | "order_not_paid";

export type TicketValidityResult =
  | { ok: true }
  | { ok: false; reason: TicketInvalidReason };

export function isTicketActive(ticket: Ticket): boolean {
  return ticket.status === "active";
}

export function isOrderValidForTicket(orderStatus: OrderStatus): boolean {
  return orderStatus === "paid";
}

export function isTicketValidForCheckin(
  ticket: Ticket,
  orderStatus: OrderStatus,
): TicketValidityResult {
  if (!isTicketActive(ticket)) {
    return { ok: false, reason: "ticket_not_active" };
  }
  if (!isOrderValidForTicket(orderStatus)) {
    return { ok: false, reason: "order_not_paid" };
  }
  return { ok: true };
}
