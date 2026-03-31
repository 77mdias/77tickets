import { describe, expect, test } from "vitest";

import { validateLotForPurchase } from "@/server/domain/lots/lot.rules";
import type { Lot } from "@/server/domain/lots";
import { isTicketValidForCheckin } from "@/server/domain/tickets/ticket.rules";
import type { Ticket } from "@/server/domain/tickets";

function makeLot(overrides: Partial<Lot> = {}): Lot {
  return {
    id: "lot-reg-001",
    eventId: "evt-reg-001",
    title: "Regression Lot",
    priceInCents: 5000,
    totalQuantity: 100,
    availableQuantity: 2,
    maxPerOrder: 5,
    saleStartsAt: new Date("2026-05-01T00:00:00.000Z"),
    saleEndsAt: new Date("2026-05-31T23:59:59.000Z"),
    status: "active",
    ...overrides,
  };
}

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "tkt-reg-001",
    eventId: "evt-reg-001",
    orderId: "ord-reg-001",
    lotId: "lot-reg-001",
    code: "REG-001",
    status: "active",
    checkedInAt: null,
    ...overrides,
  };
}

describe("SEC-002 regression coverage: stock and state", () => {
  test("prevents oversell when requested quantity exceeds lot available quantity", () => {
    const lot = makeLot({ availableQuantity: 2 });
    const now = new Date("2026-05-15T12:00:00.000Z");

    expect(validateLotForPurchase(lot, 3, now)).toEqual({
      ok: false,
      reason: "insufficient_stock",
    });
  });

  test("rejects active ticket check-in when order is expired", () => {
    const ticket = makeTicket({ status: "active" });

    expect(isTicketValidForCheckin(ticket, "expired")).toEqual({
      ok: false,
      reason: "order_not_paid",
    });
  });
});
