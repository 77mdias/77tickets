import { createGetCustomerOrdersHandler } from "@/server/api/orders/get-customer-orders.handler";
import { createGetCustomerOrdersRouteAdapter } from "@/server/api/orders/get-customer-orders.route-adapter";
import { getSession } from "@/server/infrastructure/auth";
import { createGetCustomerOrdersUseCase } from "@/server/application/use-cases";
import { getOrderRepository, getTicketRepository } from "@/server/composition-root";

type GetCustomerOrdersRouteHandler = (request: Request) => Promise<Response>;

let cachedGetCustomerOrdersRouteHandler: GetCustomerOrdersRouteHandler | null = null;

const buildGetCustomerOrdersRouteHandler = (): GetCustomerOrdersRouteHandler => {
  const getCustomerOrders = createGetCustomerOrdersUseCase({
    orderRepository: getOrderRepository(),
    ticketRepository: getTicketRepository(),
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
