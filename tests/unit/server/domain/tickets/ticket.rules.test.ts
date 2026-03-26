import { describe, expect, test } from "vitest";

import {
  isOrderValidForTicket,
  isTicketActive,
  isTicketValidForCheckin,
} from "@/src/server/domain/tickets/ticket.rules";

import type { Ticket } from "@/src/server/domain/tickets";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "tkt-001",
    eventId: "evt-001",
    orderId: "ord-001",
    lotId: "lot-001",
    code: "ABC-001",
    status: "active",
    checkedInAt: null,
    ...overrides,
  };
}

// ─── isTicketActive ────────────────────────────────────────────────────────────

describe("isTicketActive", () => {
  test("returns true when status is active", () => {
    expect(isTicketActive(makeTicket({ status: "active" }))).toBe(true);
  });

  test("returns false when status is used", () => {
    expect(isTicketActive(makeTicket({ status: "used" }))).toBe(false);
  });

  test("returns false when status is cancelled", () => {
    expect(isTicketActive(makeTicket({ status: "cancelled" }))).toBe(false);
  });
});

// ─── isOrderValidForTicket ────────────────────────────────────────────────────

describe("isOrderValidForTicket", () => {
  test("returns true when order is paid", () => {
    expect(isOrderValidForTicket("paid")).toBe(true);
  });

  test("returns false when order is pending", () => {
    expect(isOrderValidForTicket("pending")).toBe(false);
  });

  test("returns false when order is expired", () => {
    expect(isOrderValidForTicket("expired")).toBe(false);
  });

  test("returns false when order is cancelled", () => {
    expect(isOrderValidForTicket("cancelled")).toBe(false);
  });
});

// ─── isTicketValidForCheckin ──────────────────────────────────────────────────

describe("isTicketValidForCheckin", () => {
  test("returns ok:true when ticket is active and order is paid", () => {
    expect(isTicketValidForCheckin(makeTicket({ status: "active" }), "paid")).toEqual({
      ok: true,
    });
  });

  test("returns order_not_paid when ticket is active but order is expired", () => {
    expect(isTicketValidForCheckin(makeTicket({ status: "active" }), "expired")).toEqual({
      ok: false,
      reason: "order_not_paid",
    });
  });

  test("returns order_not_paid when ticket is active but order is pending", () => {
    expect(isTicketValidForCheckin(makeTicket({ status: "active" }), "pending")).toEqual({
      ok: false,
      reason: "order_not_paid",
    });
  });

  test("returns order_not_paid when ticket is active but order is cancelled", () => {
    expect(isTicketValidForCheckin(makeTicket({ status: "active" }), "cancelled")).toEqual({
      ok: false,
      reason: "order_not_paid",
    });
  });

  test("returns ticket_not_active when ticket is used and order is paid", () => {
    expect(isTicketValidForCheckin(makeTicket({ status: "used" }), "paid")).toEqual({
      ok: false,
      reason: "ticket_not_active",
    });
  });

  test("returns ticket_not_active when ticket is cancelled and order is paid", () => {
    expect(isTicketValidForCheckin(makeTicket({ status: "cancelled" }), "paid")).toEqual({
      ok: false,
      reason: "ticket_not_active",
    });
  });

  test("returns ticket_not_active (priority) when ticket is used and order is expired", () => {
    expect(isTicketValidForCheckin(makeTicket({ status: "used" }), "expired")).toEqual({
      ok: false,
      reason: "ticket_not_active",
    });
  });
});
