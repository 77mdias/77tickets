import { expect, test, vi } from "vitest";

import type { ValidateCheckinResult } from "../../../src/server/application/checkin";

type TicketStatus = "active" | "used" | "cancelled";
type OrderStatus = "pending" | "paid" | "expired" | "cancelled";

type ValidateCheckinUseCaseFactory = (dependencies: {
  now: () => Date;
  checkerId: string;
  ticketRepository: {
    findById: (ticketId: string) => Promise<{
      id: string;
      eventId: string;
      orderId: string;
      lotId: string;
      code: string;
      status: TicketStatus;
      checkedInAt: Date | null;
    } | null>;
    markAsUsedIfActive: (
      ticketId: string,
      checkedInAt: Date,
    ) => Promise<boolean>;
  };
  orderRepository: {
    findById: (orderId: string) => Promise<{
      order: {
        id: string;
        customerId: string;
        eventId: string;
        status: OrderStatus;
        subtotalInCents: number;
        discountInCents: number;
        totalInCents: number;
        createdAt: Date;
      };
      items: Array<{ lotId: string; quantity: number; unitPriceInCents: number }>;
    } | null>;
  };
}) => (input: { ticketId: string; eventId: string }) => Promise<ValidateCheckinResult>;

const FIXED_NOW = new Date("2026-03-29T12:00:00.000Z");
const EVENT_ID = "2f180791-a8f5-4cf8-b703-0f220a44f7c8";
const OTHER_EVENT_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";
const ORDER_ID = "c12f34a1-c6d3-4fcb-aa6d-8fb7f8fc04d5";
const TICKET_ID = "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e";
const CHECKER_ID = "a1083f53-f9c2-4d54-93a4-44eb4146db62";

async function loadValidateCheckinFactory(): Promise<ValidateCheckinUseCaseFactory> {
  const useCaseModule = await import(
    "../../../src/server/application/use-cases/validate-checkin.use-case"
  );

  const createValidateCheckinUseCase = (
    useCaseModule as { createValidateCheckinUseCase?: unknown }
  ).createValidateCheckinUseCase;

  if (typeof createValidateCheckinUseCase !== "function") {
    throw new Error(
      "CHK-002 RED: expected createValidateCheckinUseCase to be exported by validate-checkin.use-case.ts",
    );
  }

  return createValidateCheckinUseCase as ValidateCheckinUseCaseFactory;
}

function makeDependencies(options?: {
  ticketStatus?: TicketStatus;
  orderStatus?: OrderStatus;
  ticketEventId?: string;
  markAsUsedIfActiveResult?: boolean;
}) {
  const ticketStatus = options?.ticketStatus ?? "active";
  const orderStatus = options?.orderStatus ?? "paid";
  const ticketEventId = options?.ticketEventId ?? EVENT_ID;
  const markAsUsedIfActiveResult = options?.markAsUsedIfActiveResult ?? true;

  const markAsUsedIfActive = vi.fn(async () => markAsUsedIfActiveResult);

  return {
    now: () => FIXED_NOW,
    checkerId: CHECKER_ID,
    ticketRepository: {
      findById: vi.fn(async () => ({
        id: TICKET_ID,
        eventId: ticketEventId,
        orderId: ORDER_ID,
        lotId: "lot-001",
        code: "CHK-002-TICKET-001",
        status: ticketStatus,
        checkedInAt: null,
      })),
      markAsUsedIfActive,
    },
    orderRepository: {
      findById: vi.fn(async () => ({
        order: {
          id: ORDER_ID,
          customerId: "customer-001",
          eventId: ticketEventId,
          status: orderStatus,
          subtotalInCents: 10000,
          discountInCents: 0,
          totalInCents: 10000,
          createdAt: new Date("2026-03-28T12:00:00.000Z"),
        },
        items: [],
      })),
    },
  };
}

test("CHK-002 RED: approves check-in for active ticket in matching event with eligible order", async () => {
  const createValidateCheckinUseCase = await loadValidateCheckinFactory();
  const dependencies = makeDependencies();

  const validateCheckin = createValidateCheckinUseCase(dependencies);

  const result = await validateCheckin({
    ticketId: TICKET_ID,
    eventId: EVENT_ID,
  });

  expect(result).toMatchObject({
    outcome: "approved",
    ticketId: TICKET_ID,
    eventId: EVENT_ID,
    checkerId: CHECKER_ID,
  });
  expect(typeof result.validatedAt).toBe("string");
  expect(dependencies.ticketRepository.markAsUsedIfActive).toHaveBeenCalledWith(
    TICKET_ID,
    FIXED_NOW,
  );
});

test("CHK-002 RED: rejects check-in when ticket was already used", async () => {
  const createValidateCheckinUseCase = await loadValidateCheckinFactory();
  const dependencies = makeDependencies({ ticketStatus: "used" });

  const validateCheckin = createValidateCheckinUseCase(dependencies);

  const result = await validateCheckin({
    ticketId: TICKET_ID,
    eventId: EVENT_ID,
  });

  expect(result).toMatchObject({
    outcome: "rejected",
    reason: "ticket_used",
    ticketId: TICKET_ID,
    eventId: EVENT_ID,
    checkerId: CHECKER_ID,
  });
  expect(dependencies.ticketRepository.markAsUsedIfActive).not.toHaveBeenCalled();
});

test("CHK-002 RED: rejects check-in when ticket is cancelled", async () => {
  const createValidateCheckinUseCase = await loadValidateCheckinFactory();
  const dependencies = makeDependencies({ ticketStatus: "cancelled" });

  const validateCheckin = createValidateCheckinUseCase(dependencies);

  const result = await validateCheckin({
    ticketId: TICKET_ID,
    eventId: EVENT_ID,
  });

  expect(result).toMatchObject({
    outcome: "rejected",
    reason: "ticket_cancelled",
    ticketId: TICKET_ID,
    eventId: EVENT_ID,
    checkerId: CHECKER_ID,
  });
  expect(dependencies.ticketRepository.markAsUsedIfActive).not.toHaveBeenCalled();
});

test("CHK-002 RED: rejects check-in when order is expired", async () => {
  const createValidateCheckinUseCase = await loadValidateCheckinFactory();
  const dependencies = makeDependencies({ orderStatus: "expired" });

  const validateCheckin = createValidateCheckinUseCase(dependencies);

  const result = await validateCheckin({
    ticketId: TICKET_ID,
    eventId: EVENT_ID,
  });

  expect(result).toMatchObject({
    outcome: "rejected",
    reason: "order_not_eligible",
    ticketId: TICKET_ID,
    eventId: EVENT_ID,
    checkerId: CHECKER_ID,
  });
  expect(dependencies.ticketRepository.markAsUsedIfActive).not.toHaveBeenCalled();
});

test("CHK-002 RED: rejects check-in when ticket belongs to a different event", async () => {
  const createValidateCheckinUseCase = await loadValidateCheckinFactory();
  const dependencies = makeDependencies({ ticketEventId: OTHER_EVENT_ID });

  const validateCheckin = createValidateCheckinUseCase(dependencies);

  const result = await validateCheckin({
    ticketId: TICKET_ID,
    eventId: EVENT_ID,
  });

  expect(result).toMatchObject({
    outcome: "rejected",
    reason: "event_mismatch",
    ticketId: TICKET_ID,
    eventId: EVENT_ID,
    checkerId: CHECKER_ID,
  });
  expect(dependencies.ticketRepository.markAsUsedIfActive).not.toHaveBeenCalled();
});

test("OPS-002: rejects check-in when atomic mark fails due concurrent usage", async () => {
  const createValidateCheckinUseCase = await loadValidateCheckinFactory();
  const dependencies = makeDependencies({ markAsUsedIfActiveResult: false });

  const validateCheckin = createValidateCheckinUseCase(dependencies);

  const result = await validateCheckin({
    ticketId: TICKET_ID,
    eventId: EVENT_ID,
  });

  expect(result).toMatchObject({
    outcome: "rejected",
    reason: "ticket_used",
    ticketId: TICKET_ID,
    eventId: EVENT_ID,
    checkerId: CHECKER_ID,
  });
  expect(dependencies.ticketRepository.markAsUsedIfActive).toHaveBeenCalledWith(
    TICKET_ID,
    FIXED_NOW,
  );
});
