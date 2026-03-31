import type { ListEventOrdersInput, ListEventOrdersResult } from "../events";
import { createNotFoundError } from "../errors";
import { assertEventManagementAccess } from "../security";
import type {
  EventRepository,
  OrderItemWithLotRecord,
  OrderRepository,
} from "../../repositories";

export type { ListEventOrdersInput, ListEventOrdersResult };

export type ListEventOrdersUseCase = (
  input: ListEventOrdersInput,
) => Promise<ListEventOrdersResult>;

interface EventOrderRecord {
  order: {
    id: string;
    customerId: string;
    eventId: string;
    status: "pending" | "paid" | "expired" | "cancelled";
    subtotalInCents: number;
    discountInCents: number;
    totalInCents: number;
    createdAt: Date;
  };
  items: OrderItemWithLotRecord[];
}

interface EventOrderRepository {
  listByEventId(eventId: string): Promise<EventOrderRecord[]>;
}

export interface ListEventOrdersUseCaseDependencies {
  eventRepository: Pick<EventRepository, "findById">;
  orderRepository: Pick<OrderRepository, never> & EventOrderRepository;
}

export const createListEventOrdersUseCase = (
  dependencies: ListEventOrdersUseCaseDependencies,
): ListEventOrdersUseCase => {
  return async (input) => {
    const event = await dependencies.eventRepository.findById(input.eventId);

    if (!event) {
      throw createNotFoundError("Event not found");
    }

    assertEventManagementAccess({
      actor: input.actor,
      eventOrganizerId: event.organizerId,
    });

    const orders = await dependencies.orderRepository.listByEventId(input.eventId);

    return {
      eventId: input.eventId,
      orders: orders.map(({ order, items }) => ({
        orderId: order.id,
        customerId: order.customerId,
        status: order.status,
        subtotalInCents: order.subtotalInCents,
        discountInCents: order.discountInCents,
        totalInCents: order.totalInCents,
        createdAt: order.createdAt,
        items,
      })),
    };
  };
};
