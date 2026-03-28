import { describe, expect, test } from "vitest";

import {
  isOrderStatusEligibleForActiveTicket,
  validateOrderTransition,
} from "@/src/server/domain/orders/order.rules";
import type { Ticket } from "@/src/server/domain/tickets";
import { isTicketValidForCheckin } from "@/src/server/domain/tickets/ticket.rules";

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "tkt-ord-reg-001",
    eventId: "evt-ord-reg-001",
    orderId: "ord-ord-reg-001",
    lotId: "lot-ord-reg-001",
    code: "ORD-REG-001",
    status: "active",
    checkedInAt: null,
    ...overrides,
  };
}

describe("ORD-004 regression coverage: order expiration and invalid state", () => {
  test("expired order is not eligible to keep active ticket", () => {
    expect(isOrderStatusEligibleForActiveTicket("expired")).toBe(false);
    expect(isTicketValidForCheckin(makeTicket(), "expired")).toEqual({
      ok: false,
      reason: "order_not_paid",
    });
  });

  test("rejects invalid transition from paid to expired", () => {
    expect(validateOrderTransition("paid", "expired")).toEqual({
      ok: false,
      reason: "invalid_transition",
    });
  });
});
