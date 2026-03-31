import { createCreateOrderHandler } from "@/server/api/create-order.handler";
import {
  createCreateOrderRouteAdapter,
  getDatabaseUrlOrThrow,
} from "@/server/api/orders/create-order.route-adapter";
import { getSession } from "@/server/infrastructure/auth";
import { createCreateOrderUseCase } from "@/server/application/use-cases/create-order.use-case";
import { createDb } from "@/server/infrastructure/db/client";
import { createConsoleCheckoutObservability } from "@/server/infrastructure/observability";
import {
  DrizzleCouponRepository,
  DrizzleLotRepository,
  DrizzleOrderRepository,
} from "@/server/repositories/drizzle";

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
