import { createGetEventAnalyticsHandler } from "@/server/api/events/get-event-analytics.handler";
import { createGetEventAnalyticsRouteAdapter } from "@/server/api/events/get-event-analytics.route-adapter";
import { getSession } from "@/server/infrastructure/auth";
import { createGetEventAnalyticsUseCase } from "@/server/application/use-cases";
import { getDb } from "@/server/infrastructure/db";
import {
  DrizzleEventRepository,
  DrizzleLotRepository,
  DrizzleOrderRepository,
  DrizzleTicketRepository,
} from "@/server/repositories/drizzle";

type GetEventAnalyticsRouteHandler = (
  request: Request,
  context: { params: Promise<{ slug: string }> },
) => Promise<Response>;

let cachedGetEventAnalyticsRouteHandler: GetEventAnalyticsRouteHandler | null = null;

const buildGetEventAnalyticsRouteHandler = (): GetEventAnalyticsRouteHandler => {
  const db = getDb();
  const eventRepository = new DrizzleEventRepository(db);
  const lotRepository = new DrizzleLotRepository(db);
  const orderRepository = new DrizzleOrderRepository(db);
  const ticketRepository = new DrizzleTicketRepository(db);

  const handleGetEventAnalytics = createGetEventAnalyticsHandler({
    getEventAnalytics: createGetEventAnalyticsUseCase({
      eventRepository,
      lotRepository,
      orderRepository,
      ticketRepository,
    }),
  });

  return createGetEventAnalyticsRouteAdapter({
    getSession,
    handleGetEventAnalytics,
  });
};

const getGetEventAnalyticsRouteHandler = (): GetEventAnalyticsRouteHandler => {
  if (!cachedGetEventAnalyticsRouteHandler) {
    cachedGetEventAnalyticsRouteHandler = buildGetEventAnalyticsRouteHandler();
  }

  return cachedGetEventAnalyticsRouteHandler;
};

export const GET = async (
  request: Request,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> => getGetEventAnalyticsRouteHandler()(request, context);
