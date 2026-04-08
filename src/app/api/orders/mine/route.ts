import { createGetCustomerOrdersHandler } from "@/server/api/orders/get-customer-orders.handler";
import { createGetCustomerOrdersRouteAdapter } from "@/server/api/orders/get-customer-orders.route-adapter";
import { getSession } from "@/server/infrastructure/auth";
import { createGetCustomerOrdersUseCase } from "@/server/application/use-cases";
import { getDb } from "@/server/infrastructure/db";
import { DrizzleOrderRepository, DrizzleTicketRepository } from "@/server/repositories/drizzle";

type GetCustomerOrdersRouteHandler = (request: Request) => Promise<Response>;

let cachedGetCustomerOrdersRouteHandler: GetCustomerOrdersRouteHandler | null = null;

const buildGetCustomerOrdersRouteHandler = (): GetCustomerOrdersRouteHandler => {
  const db = getDb();

  const getCustomerOrders = createGetCustomerOrdersUseCase({
    orderRepository: new DrizzleOrderRepository(db),
    ticketRepository: new DrizzleTicketRepository(db),
  });

  const handleGetCustomerOrders = createGetCustomerOrdersHandler({
    getCustomerOrders,
  });

  return createGetCustomerOrdersRouteAdapter({
    getSession,
    handleGetCustomerOrders,
  });
};

const getGetCustomerOrdersRouteHandler = (): GetCustomerOrdersRouteHandler => {
  if (!cachedGetCustomerOrdersRouteHandler) {
    cachedGetCustomerOrdersRouteHandler = buildGetCustomerOrdersRouteHandler();
  }

  return cachedGetCustomerOrdersRouteHandler;
};

export const GET = async (request: Request): Promise<Response> =>
  getGetCustomerOrdersRouteHandler()(request);
