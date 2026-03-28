import { createCreateOrderHandler } from "@/src/server/api/create-order.handler";
import {
  createCreateOrderRouteAdapter,
  getDatabaseUrlOrThrow,
  resolveDemoCustomerId,
} from "@/src/server/api/orders/create-order.route-adapter";
import { createCreateOrderUseCase } from "@/src/server/application/use-cases/create-order.use-case";
import { createDb } from "@/src/server/infrastructure/db/client";
import {
  DrizzleCouponRepository,
  DrizzleLotRepository,
  DrizzleOrderRepository,
} from "@/src/server/repositories/drizzle";

type PostOrdersRouteHandler = (request: Request) => Promise<Response>;

let cachedPostOrdersRouteHandler: PostOrdersRouteHandler | null = null;

const generateUuid = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("crypto.randomUUID is unavailable");
};

const buildPostOrdersRouteHandler = (): PostOrdersRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());

  const createOrder = createCreateOrderUseCase({
    now: () => new Date(),
    generateOrderId: generateUuid,
    orderRepository: new DrizzleOrderRepository(db),
    lotRepository: new DrizzleLotRepository(db),
    couponRepository: new DrizzleCouponRepository(db),
  });

  const handleCreateOrder = createCreateOrderHandler({ createOrder });
  const customerId = resolveDemoCustomerId(process.env.DEMO_CUSTOMER_ID);

  return createCreateOrderRouteAdapter({
    customerId,
    handleCreateOrder,
  });
};

const getPostOrdersRouteHandler = (): PostOrdersRouteHandler => {
  if (!cachedPostOrdersRouteHandler) {
    cachedPostOrdersRouteHandler = buildPostOrdersRouteHandler();
  }

  return cachedPostOrdersRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getPostOrdersRouteHandler()(request);
