import { createListEventOrdersHandler } from "@/server/api/orders/list-event-orders.handler";
import { createListEventOrdersRouteAdapter } from "@/server/api/orders/list-event-orders.route-adapter";
import { getSession } from "@/server/infrastructure/auth";
import { createListEventOrdersUseCase } from "@/server/application/use-cases";
import { getDb } from "@/server/infrastructure/db";
import { DrizzleEventRepository, DrizzleOrderRepository } from "@/server/repositories/drizzle";

type GetEventOrdersRouteHandler = (
  request: Request,
  context: { params: Promise<{ slug: string }> },
) => Promise<Response>;

let cachedGetEventOrdersRouteHandler: GetEventOrdersRouteHandler | null = null;

const buildGetEventOrdersRouteHandler = (): GetEventOrdersRouteHandler => {
  const db = getDb();
  const eventRepository = new DrizzleEventRepository(db);
  const orderRepository = new DrizzleOrderRepository(db);

  const handleListEventOrders = createListEventOrdersHandler({
    listEventOrders: createListEventOrdersUseCase({
      eventRepository,
      orderRepository,
    }),
  });

  return createListEventOrdersRouteAdapter({
    getSession,
    handleListEventOrders,
  });
};

const getGetEventOrdersRouteHandler = (): GetEventOrdersRouteHandler => {
  if (!cachedGetEventOrdersRouteHandler) {
    cachedGetEventOrdersRouteHandler = buildGetEventOrdersRouteHandler();
  }

  return cachedGetEventOrdersRouteHandler;
};

export const GET = async (
  request: Request,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> => getGetEventOrdersRouteHandler()(request, context);
