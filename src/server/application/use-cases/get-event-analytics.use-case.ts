import { createAuthorizationError, createNotFoundError } from "../errors";
import { assertEventManagementAccess, type SecurityActor } from "../security";
import type {
  EventRepository,
  LotRepository,
  OrderRepository,
  TicketRepository,
} from "../../repositories";

export interface GetEventAnalyticsInput {
  eventId: string;
  actor: SecurityActor;
}

export interface EventLotAnalyticsStat {
  lotId: string;
  title: string;
  totalQuantity: number;
  availableQuantity: number;
  soldTickets: number;
  revenue: number;
  occupancyPct: number;
}

export interface EventCouponAnalyticsStat {
  couponId: string;
  uses: number;
  totalDiscount: number;
  totalRevenue: number;
}

export interface GetEventAnalyticsResult {
  eventId: string;
  totalRevenue: number;
  totalTickets: number;
  lotStats: EventLotAnalyticsStat[];
  couponStats: EventCouponAnalyticsStat[];
}

export type GetEventAnalyticsUseCase = (
  input: GetEventAnalyticsInput,
) => Promise<GetEventAnalyticsResult>;

export interface GetEventAnalyticsUseCaseDependencies {
  eventRepository: Pick<EventRepository, "findBySlug" | "findById">;
  lotRepository: Pick<LotRepository, "findByEventId">;
  orderRepository: Pick<OrderRepository, "listByEventId">;
  ticketRepository: Pick<TicketRepository, "listByOrderId">;
}

const entityIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const countValidTickets = (
  tickets: Awaited<ReturnType<TicketRepository["listByOrderId"]>>,
): number => tickets.filter((ticket) => ticket.status !== "cancelled").length;

export const createGetEventAnalyticsUseCase = (
  dependencies: GetEventAnalyticsUseCaseDependencies,
): GetEventAnalyticsUseCase => {
  return async (input) => {
    if (input.actor.role !== "admin" && input.actor.role !== "organizer") {
      throw createAuthorizationError("Forbidden");
    }

    const eventBySlug = await dependencies.eventRepository.findBySlug(input.eventId);
    const event = eventBySlug ??
      (entityIdPattern.test(input.eventId)
        ? await dependencies.eventRepository.findById(input.eventId)
        : null);

    if (!event) {
      throw createNotFoundError("Event not found");
    }

    assertEventManagementAccess({
      actor: input.actor,
      eventOrganizerId: event.organizerId,
    });

    const [lots, orders] = await Promise.all([
      dependencies.lotRepository.findByEventId(event.id),
      dependencies.orderRepository.listByEventId(event.id),
    ]);

    const paidOrders = orders.filter(({ order }) => order.status === "paid");
    const ticketsByOrderId = new Map(
      await Promise.all(
        paidOrders.map(async ({ order }) => [
          order.id,
          await dependencies.ticketRepository.listByOrderId(order.id),
        ]),
      ),
    );

    const soldTicketsByLotId = new Map<string, number>();
    const revenueByLotId = new Map<string, number>();
    const couponStatsByCouponId = new Map<string, EventCouponAnalyticsStat>();

    let totalRevenue = 0;
    let totalTickets = 0;

    for (const { order, items } of paidOrders) {
      totalRevenue += order.totalInCents;

      const orderTickets = ticketsByOrderId.get(order.id) ?? [];
      totalTickets += countValidTickets(orderTickets);

      for (const ticket of orderTickets) {
        if (ticket.status === "cancelled") {
          continue;
        }

        soldTicketsByLotId.set(
          ticket.lotId,
          (soldTicketsByLotId.get(ticket.lotId) ?? 0) + 1,
        );
      }

      for (const item of items) {
        revenueByLotId.set(
          item.lotId,
          (revenueByLotId.get(item.lotId) ?? 0) + item.quantity * item.unitPriceInCents,
        );
      }

      if (!order.couponId) {
        continue;
      }

      const couponStats = couponStatsByCouponId.get(order.couponId) ?? {
        couponId: order.couponId,
        uses: 0,
        totalDiscount: 0,
        totalRevenue: 0,
      };

      couponStats.uses += 1;
      couponStats.totalDiscount += order.discountInCents;
      couponStats.totalRevenue += order.totalInCents;
      couponStatsByCouponId.set(order.couponId, couponStats);
    }

    return {
      eventId: event.id,
      totalRevenue,
      totalTickets,
      lotStats: lots.map((lot) => {
        const soldTickets = soldTicketsByLotId.get(lot.id) ?? 0;
        const revenue = revenueByLotId.get(lot.id) ?? 0;

        return {
          lotId: lot.id,
          title: lot.title,
          totalQuantity: lot.totalQuantity,
          availableQuantity: lot.availableQuantity,
          soldTickets,
          revenue,
          occupancyPct:
            lot.totalQuantity > 0
              ? Math.round((soldTickets / lot.totalQuantity) * 100)
              : 0,
        };
      }),
      couponStats: Array.from(couponStatsByCouponId.values()),
    };
  };
};
