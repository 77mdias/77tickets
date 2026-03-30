import { createGetCustomerOrdersHandler } from "@/src/server/api/orders/get-customer-orders.handler";
import { createGetCustomerOrdersRouteAdapter } from "@/src/server/api/orders/get-customer-orders.route-adapter";
import { getDatabaseUrlOrThrow } from "@/src/server/api/orders/create-order.route-adapter";
import { getSession } from "@/src/server/infrastructure/auth";
import { createGetCustomerOrdersUseCase } from "@/src/server/application/use-cases";
import { createDb } from "@/src/server/infrastructure/db/client";
import { DrizzleOrderRepository, DrizzleTicketRepository } from "@/src/server/repositories/drizzle";

type GetCustomerOrdersRouteHandler = (request: Request) => Promise<Response>;

let cachedGetCustomerOrdersRouteHandler: GetCustomerOrdersRouteHandler | null = null;

const buildGetCustomerOrdersRouteHandler = (): GetCustomerOrdersRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());

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
