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

    const ticket = await dependencies.ticketRepository.findById(input.ticketId);
    if (!ticket) {
      return {
        ...audit,
        outcome: "rejected",
        reason: "ticket_not_found",
      };
    }

    if (ticket.eventId !== input.eventId) {
      return {
        ...audit,
        outcome: "rejected",
        reason: "event_mismatch",
      };
    }

    const ticketRejectionReason = mapTicketStatusToRejection(ticket.status);
    if (ticketRejectionReason !== null) {
      return {
        ...audit,
        outcome: "rejected",
        reason: ticketRejectionReason,
      };
    }

    const order = await dependencies.orderRepository.findById(ticket.orderId);
    if (!order || !isOrderEligibleForCheckin(order.order.status)) {
      return {
        ...audit,
        outcome: "rejected",
        reason: "order_not_eligible",
      };
    }

    const markedAsUsed = await dependencies.ticketRepository.markAsUsedIfActive(
      ticket.id,
      checkedInAt,
    );
    if (!markedAsUsed) {
      return {
        ...audit,
        outcome: "rejected",
        reason: "ticket_used",
      };
    }

    return {
      ...audit,
      outcome: "approved",
    };
  };
};
