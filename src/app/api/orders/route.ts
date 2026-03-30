import { createCreateOrderHandler } from "@/src/server/api/create-order.handler";
import {
  createCreateOrderRouteAdapter,
  getDatabaseUrlOrThrow,
} from "@/src/server/api/orders/create-order.route-adapter";
import { getSession } from "@/src/server/infrastructure/auth";
import { createCreateOrderUseCase } from "@/src/server/application/use-cases/create-order.use-case";
import { createDb } from "@/src/server/infrastructure/db/client";
import { createConsoleCheckoutObservability } from "@/src/server/infrastructure/observability";
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
  const observability = createConsoleCheckoutObservability();

  const createOrder = createCreateOrderUseCase({
    now: () => new Date(),
    generateOrderId: generateUuid,
    orderRepository: new DrizzleOrderRepository(db),
    lotRepository: new DrizzleLotRepository(db),
    couponRepository: new DrizzleCouponRepository(db),
    observability,
  });

  const handleCreateOrder = createCreateOrderHandler({ createOrder, observability });

  return createCreateOrderRouteAdapter({
    getSession,
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
