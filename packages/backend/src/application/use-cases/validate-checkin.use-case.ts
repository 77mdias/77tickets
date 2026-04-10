import type { ValidateCheckinInput, ValidateCheckinResult } from "../checkin";
import { isOrderStatusEligibleForActiveTicket } from "../../domain/orders/order.rules";
import type {
  OrderRepository,
  OrderStatus,
  TicketRepository,
  TicketStatus,
} from "../../repositories";

export type { ValidateCheckinInput, ValidateCheckinResult };

export type ValidateCheckinUseCase = (
  input: ValidateCheckinInput,
) => Promise<ValidateCheckinResult>;

export interface ValidateCheckinUseCaseCheckinValidatedEntry {
  ticketId: string;
  eventId: string;
  checkerId: string;
  outcome: string;
  timestamp: string;
}

export interface ValidateCheckinUseCaseObservability {
  logCheckinValidated(entry: ValidateCheckinUseCaseCheckinValidatedEntry): void | Promise<void>;
}

export interface ValidateCheckinUseCaseDependencies {
  now: () => Date;
  ticketRepository: Pick<TicketRepository, "markAsUsedIfActive"> & {
    findById(ticketId: string): Promise<{
      id: string;
      eventId: string;
      orderId: string;
      lotId: string;
      code: string;
      status: TicketStatus;
      checkedInAt: Date | null;
    } | null>;
  };
  orderRepository: Pick<OrderRepository, "findById">;
  observability?: ValidateCheckinUseCaseObservability;
}

const createAuditMetadata = (
  input: ValidateCheckinInput,
  validatedAt: Date,
) => ({
  ticketId: input.ticketId,
  eventId: input.eventId,
  checkerId: input.checkerId,
  validatedAt: validatedAt.toISOString(),
});

const mapTicketStatusToRejection = (
  status: TicketStatus,
): "ticket_used" | "ticket_cancelled" | null => {
  if (status === "used") {
    return "ticket_used";
  }
  if (status === "cancelled") {
    return "ticket_cancelled";
  }
  return null;
};

const isOrderEligibleForCheckin = (orderStatus: OrderStatus): boolean =>
  isOrderStatusEligibleForActiveTicket(orderStatus);

export const createValidateCheckinUseCase = (
  dependencies: ValidateCheckinUseCaseDependencies,
): ValidateCheckinUseCase => {
  return async (input: ValidateCheckinInput): Promise<ValidateCheckinResult> => {
    const checkedInAt = dependencies.now();
    const audit = createAuditMetadata(input, checkedInAt);
    const { observability } = dependencies;

    const logOutcome = async (result: ValidateCheckinResult): Promise<void> => {
      if (!observability) return;
      try {
        await observability.logCheckinValidated({
          ticketId: input.ticketId,
          eventId: input.eventId,
          checkerId: input.checkerId,
          outcome: result.outcome,
          timestamp: checkedInAt.toISOString(),
        });
      } catch {
        // best-effort: logging must not break the flow
      }
    };

    const ticket = await dependencies.ticketRepository.findById(input.ticketId);
    if (!ticket) {
      const result = { ...audit, outcome: "rejected" as const, reason: "ticket_not_found" as const };
      await logOutcome(result);
      return result;
    }

    if (ticket.eventId !== input.eventId) {
      const result = { ...audit, outcome: "rejected" as const, reason: "event_mismatch" as const };
      await logOutcome(result);
      return result;
    }

    const ticketRejectionReason = mapTicketStatusToRejection(ticket.status);
    if (ticketRejectionReason !== null) {
      const result = { ...audit, outcome: "rejected" as const, reason: ticketRejectionReason };
      await logOutcome(result);
      return result;
    }

    const order = await dependencies.orderRepository.findById(ticket.orderId);
    if (!order || !isOrderEligibleForCheckin(order.order.status)) {
      const result = { ...audit, outcome: "rejected" as const, reason: "order_not_eligible" as const };
      await logOutcome(result);
      return result;
    }

    const markedAsUsed = await dependencies.ticketRepository.markAsUsedIfActive(
      ticket.id,
      checkedInAt,
    );
    if (!markedAsUsed) {
      const result = { ...audit, outcome: "rejected" as const, reason: "ticket_used" as const };
      await logOutcome(result);
      return result;
    }

    const result = { ...audit, outcome: "approved" as const };
    await logOutcome(result);
    return result;
  };
};
