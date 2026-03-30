import { describe, expect, test, vi } from "vitest";

import { createValidateCheckinUseCase } from "../../../../../src/server/application/use-cases/validate-checkin.use-case";

const CHECKER_ID = "a1083f53-f9c2-4d54-93a4-44eb4146db62";
const TICKET_ID = "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e";
const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const ORDER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";

const makeActiveTicket = () => ({
  id: TICKET_ID,
  eventId: EVENT_ID,
  orderId: ORDER_ID,
  lotId: "00000000-0000-0000-0000-000000000001",
  code: "TKT-001",
  status: "active" as const,
  checkedInAt: null,
});

const makeEligibleOrder = () => ({
  order: {
    id: ORDER_ID,
    status: "paid" as const,
  },
});

describe("createValidateCheckinUseCase", () => {
  test("accepts checkerId from input and returns it in audit metadata", async () => {
    const ticketRepository = {
      findById: vi.fn(async () => makeActiveTicket()),
      markAsUsedIfActive: vi.fn(async () => true),
    };
    const orderRepository = {
      findById: vi.fn(async () => makeEligibleOrder()),
    };

    const useCase = createValidateCheckinUseCase({
      now: () => new Date("2026-03-29T12:00:00Z"),
      ticketRepository,
      orderRepository,
    });

    const result = await useCase({
      ticketId: TICKET_ID,
      eventId: EVENT_ID,
      checkerId: CHECKER_ID,
    });

    expect(result.outcome).toBe("approved");
    expect(result.checkerId).toBe(CHECKER_ID);
  });

  test("uses checkerId from input in audit metadata (different callers produce different checkerIds)", async () => {
    const OTHER_CHECKER = "00000000-0000-0000-0000-000000000099";
    const ticketRepository = {
      findById: vi.fn(async () => makeActiveTicket()),
      markAsUsedIfActive: vi.fn(async () => true),
    };
    const orderRepository = {
      findById: vi.fn(async () => makeEligibleOrder()),
    };

    const useCase = createValidateCheckinUseCase({
      now: () => new Date("2026-03-29T12:00:00Z"),
      ticketRepository,
      orderRepository,
    });

    const result = await useCase({
      ticketId: TICKET_ID,
      eventId: EVENT_ID,
      checkerId: OTHER_CHECKER,
    });

    expect(result.checkerId).toBe(OTHER_CHECKER);
  });

  test("rejects when ticket is not found", async () => {
    const ticketRepository = {
      findById: vi.fn(async () => null),
      markAsUsedIfActive: vi.fn(async () => false),
    };
    const orderRepository = { findById: vi.fn(async () => makeEligibleOrder()) };

    const useCase = createValidateCheckinUseCase({
      now: () => new Date(),
      ticketRepository,
      orderRepository,
    });

    const result = await useCase({ ticketId: TICKET_ID, eventId: EVENT_ID, checkerId: CHECKER_ID });

    expect(result.outcome).toBe("rejected");
    if (result.outcome === "rejected") {
      expect(result.reason).toBe("ticket_not_found");
    }
  });
});
