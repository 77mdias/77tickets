import type { OrderStatus } from "./order.types";

export type OrderTransitionReason = "invalid_transition" | "order_is_terminal";

export type OrderTransitionResult =
  | { ok: true }
  | { ok: false; reason: OrderTransitionReason };

const TERMINAL_STATUSES: OrderStatus[] = ["expired", "cancelled"];

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "expired", "cancelled"],
  paid: ["cancelled"],
  expired: [],
  cancelled: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isOrderStatusEligibleForActiveTicket(orderStatus: OrderStatus): boolean {
  return orderStatus === "paid";
}

export function validateOrderTransition(
  from: OrderStatus,
  to: OrderStatus,
): OrderTransitionResult {
  if (TERMINAL_STATUSES.includes(from)) {
    return { ok: false, reason: "order_is_terminal" };
  }
  if (!canTransitionOrder(from, to)) {
    return { ok: false, reason: "invalid_transition" };
  }
  return { ok: true };
}
