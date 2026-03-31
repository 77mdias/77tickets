import { describe, expect, test } from "vitest";

import type { ValidateCheckinResult } from "@/server/application/checkin";
import { createValidateCheckinUseCase } from "@/server/application/use-cases/validate-checkin.use-case";

const FIXED_NOW = new Date("2026-03-29T15:00:00.000Z");
const CHECKER_ID = "checker-regression-001";
const EVENT_ID = "event-regression-001";
const ORDER_ID = "order-regression-001";
const TICKET_ID = "ticket-regression-001";

type TicketStatus = "active" | "used" | "cancelled";
type OrderStatus = "pending" | "paid" | "expired" | "cancelled";

function createCheckinDependencies(options?: {
  initialTicketStatus?: TicketStatus;
  orderStatus?: OrderStatus;
}) {
  const orderStatus = options?.orderStatus ?? "paid";
  const ticketState: { status: TicketStatus; checkedInAt: Date | null } = {
    status: options?.initialTicketStatus ?? "active",
    checkedInAt: null,
  };

  return {
    now: () => FIXED_NOW,
    ticketRepository: {
      async findById(ticketId: string) {
        if (ticketId !== TICKET_ID) {
          return null;
        }

        return {
          id: TICKET_ID,
          eventId: EVENT_ID,
          orderId: ORDER_ID,
          lotId: "lot-regression-001",
          code: "REG-CHECKIN-001",
          status: ticketState.status,
          checkedInAt: ticketState.checkedInAt,
        };
      },
      async markAsUsedIfActive(_ticketId: string, checkedInAt: Date) {
        if (ticketState.status !== "active") {
          return false;
        }

        ticketState.status = "used";
        ticketState.checkedInAt = checkedInAt;
        return true;
      },
    },
    orderRepository: {
      async findById(orderId: string) {
        if (orderId !== ORDER_ID) {
          return null;
        }

        return {
          order: {
            id: ORDER_ID,
            customerId: "customer-regression-001",
            eventId: EVENT_ID,
            status: orderStatus,
            subtotalInCents: 10000,
            discountInCents: 0,
            totalInCents: 10000,
            createdAt: new Date("2026-03-29T10:00:00.000Z"),
          },
          items: [],
        };
      },
    },
  };
}

function countOutcomes(results: ValidateCheckinResult[]) {
  const approved = results.filter((result) => result.outcome === "approved").length;
  const rejected = results.filter((result) => result.outcome === "rejected").length;

  return { approved, rejected };
}

describe("SEC-002 regression coverage: check-in", () => {
  test("rejects check-in when ticket belongs to a different event", async () => {
    const DIFFERENT_EVENT_ID = "event-regression-different-001";

    // ticket.eventId is EVENT_ID; input uses DIFFERENT_EVENT_ID → event_mismatch
    const dependencies = createCheckinDependencies();
    const validateCheckin = createValidateCheckinUseCase(dependencies);

    const result = await validateCheckin({
      ticketId: TICKET_ID,
      eventId: DIFFERENT_EVENT_ID,
      checkerId: CHECKER_ID,
    });

    expect(result).toMatchObject({
      outcome: "rejected",
      reason: "event_mismatch",
      ticketId: TICKET_ID,
      eventId: DIFFERENT_EVENT_ID,
      checkerId: CHECKER_ID,
    });
  });

  test("allows only one successful check-in when two attempts happen concurrently", async () => {
    const dependencies = createCheckinDependencies();
    const validateCheckin = createValidateCheckinUseCase(dependencies);

    const [firstAttempt, secondAttempt] = await Promise.all([
      validateCheckin({ ticketId: TICKET_ID, eventId: EVENT_ID, checkerId: CHECKER_ID }),
      validateCheckin({ ticketId: TICKET_ID, eventId: EVENT_ID, checkerId: CHECKER_ID }),
    ]);
    const results = [firstAttempt, secondAttempt];

    expect(countOutcomes(results)).toEqual({ approved: 1, rejected: 1 });
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ outcome: "approved" }),
        expect.objectContaining({ outcome: "rejected", reason: "ticket_used" }),
      ]),
    );
  });

  test("rejects check-in when ticket order is expired", async () => {
    const dependencies = createCheckinDependencies({ orderStatus: "expired" });
    const validateCheckin = createValidateCheckinUseCase(dependencies);

    const result = await validateCheckin({
      ticketId: TICKET_ID,
      eventId: EVENT_ID,
      checkerId: CHECKER_ID,
    });

    expect(result).toMatchObject({
      outcome: "rejected",
      reason: "order_not_eligible",
      ticketId: TICKET_ID,
      eventId: EVENT_ID,
      checkerId: CHECKER_ID,
    });
  });
});
