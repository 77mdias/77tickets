import type {
  OrderItemRecord,
  OrderRepository,
  TicketRepository,
  TicketStatus,
} from "../../repositories";

export interface GetCustomerOrdersInput {
  customerId: string;
}

export interface CustomerTicketSummary {
  id: string;
  token: string;
  status: TicketStatus;
  eventId: string;
  orderId: string;
  checkedInAt: Date | null;
}

export interface CustomerOrderSummary {
  id: string;
  eventId: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  createdAt: Date;
  items: OrderItemRecord[];
  tickets: CustomerTicketSummary[];
}

export interface GetCustomerOrdersResult {
  orders: CustomerOrderSummary[];
}

export type GetCustomerOrdersUseCase = (
  input: GetCustomerOrdersInput,
) => Promise<GetCustomerOrdersResult>;

export interface GetCustomerOrdersUseCaseDependencies {
  orderRepository: Pick<OrderRepository, "listByCustomerId">;
  ticketRepository: Pick<TicketRepository, "listByCustomerId">;
}

export const createGetCustomerOrdersUseCase = (
  dependencies: GetCustomerOrdersUseCaseDependencies,
): GetCustomerOrdersUseCase => {
  return async (input) => {
    const [orders, tickets] = await Promise.all([
      dependencies.orderRepository.listByCustomerId(input.customerId),
      dependencies.ticketRepository.listByCustomerId(input.customerId),
    ]);

    const ticketsByOrderId = new Map<string, CustomerTicketSummary[]>();

    for (const ticket of tickets) {
      const groupedTickets = ticketsByOrderId.get(ticket.orderId) ?? [];
      groupedTickets.push({
        id: ticket.id,
        token: ticket.code,
        status: ticket.status,
        eventId: ticket.eventId,
        orderId: ticket.orderId,
        checkedInAt: ticket.checkedInAt,
      });
      ticketsByOrderId.set(ticket.orderId, groupedTickets);
    }

    return {
      orders: orders.map(({ order, items }) => ({
        id: order.id,
        eventId: order.eventId,
        status: order.status,
        subtotalInCents: order.subtotalInCents,
        discountInCents: order.discountInCents,
        totalInCents: order.totalInCents,
        createdAt: order.createdAt,
        items,
        tickets: ticketsByOrderId.get(order.id) ?? [],
      })),
    };
  };
};
