import { createCreateOrderHandler } from "@/server/api/orders/create-order.handler";
import type { CreateOrderHandlerResponse, CreateOrderRequest } from "@/server/api/orders/create-order.handler";
import {
  createCreateOrderRouteAdapter,
  getDatabaseUrlOrThrow,
} from "@/server/api/orders/create-order.route-adapter";
import { createOrderRateLimiter } from "@/server/api/middleware";
import { getSession } from "@/server/infrastructure/auth";
import {
  createCreateOrderUseCase,
  createCreateStripeCheckoutSessionUseCase,
} from "@/server/application/use-cases";
import { createDb } from "@/server/infrastructure/db/client";
import { createConsoleCheckoutObservability } from "@/server/infrastructure/observability";
import {
  DrizzleCouponRepository,
  DrizzleLotRepository,
  DrizzleOrderRepository,
} from "@/server/repositories/drizzle";
import { createStripePaymentProvider } from "@/server/payment/stripe.payment-provider";

type PostOrdersRouteHandler = (request: Request) => Promise<Response>;
type PaymentMode = "demo" | "stripe";

let cachedPostOrdersRouteHandler: PostOrdersRouteHandler | null = null;
const checkRateLimit = createOrderRateLimiter();

const generateUuid = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  throw new Error("crypto.randomUUID is unavailable");
};

const getPaymentMode = (): PaymentMode => {
  const normalized = (process.env.PAYMENT_MODE ?? "demo").trim().toLowerCase();
  return normalized === "stripe" ? "stripe" : "demo";
};

const buildDemoCheckoutUrl = (orderId: string): string =>
  `/checkout/simulate?orderId=${encodeURIComponent(orderId)}`;

const buildPostOrdersRouteHandler = (): PostOrdersRouteHandler => {
  const db = createDb(getDatabaseUrlOrThrow());
  const observability = createConsoleCheckoutObservability();
  const orderRepository = new DrizzleOrderRepository(db);

  const createOrder = createCreateOrderUseCase({
    now: () => new Date(),
    generateOrderId: generateUuid,
    orderRepository,
    lotRepository: new DrizzleLotRepository(db),
    couponRepository: new DrizzleCouponRepository(db),
    observability,
  });

  const paymentMode = getPaymentMode();
  const createStripeCheckoutSession =
    paymentMode === "stripe"
      ? createCreateStripeCheckoutSessionUseCase({
          orderRepository,
          paymentProvider: createStripePaymentProvider(),
        })
      : null;

  const baseHandleCreateOrder = createCreateOrderHandler({ createOrder, observability });
  const handleCreateOrder = async (
    request: CreateOrderRequest,
  ): Promise<CreateOrderHandlerResponse> => {
    const response = await baseHandleCreateOrder(request);

    if (response.status !== 200) {
      return response;
    }

    const checkoutUrl =
      paymentMode === "demo"
        ? buildDemoCheckoutUrl(response.body.data.orderId)
        : (
            await createStripeCheckoutSession!({
              orderId: response.body.data.orderId,
              customerId: request.actor.userId,
            })
          ).checkoutUrl;

    return {
      status: 200,
      body: {
        data: {
          ...response.body.data,
          checkoutUrl,
        },
      },
    };
  };

  return createCreateOrderRouteAdapter({
    getSession,
    handleCreateOrder,
    checkRateLimit,
    rateLimitMaxRequests: 10,
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
