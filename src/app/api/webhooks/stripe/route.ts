import {
  createConfirmOrderPaymentUseCase,
  createCancelOrderOnPaymentFailureUseCase,
  createSendOrderConfirmationEmailUseCase,
} from "@/server/application/use-cases";
import { createValidationError, serializeAppError } from "@/server/application/errors";
import { getDb } from "@/server/infrastructure/db";
import {
  DrizzleCouponRepository,
  DrizzleEventRepository,
  DrizzleLotRepository,
  DrizzleOrderRepository,
  DrizzleTicketRepository,
  DrizzleUserRepository,
} from "@/server/repositories/drizzle";
import { createStripePaymentProvider } from "@/server/payment/stripe.payment-provider";
import { createResendEmailProvider } from "@/server/email";
import { toApiJsonResponse, withApiSecurityHeaders } from "@/server/api/security-response";
import { mapAppErrorToResponse } from "@/server/api/error-mapper";

const badRequest = (message: string): Response =>
  toApiJsonResponse(400, {
    error: serializeAppError(createValidationError(message)),
  });

const readOrderIdFromEvent = (event: {
  data?: { object?: { metadata?: { orderId?: string } } };
}): string | null => {
  const orderId = event.data?.object?.metadata?.orderId;

  if (typeof orderId !== "string") {
    return null;
  }

  const normalized = orderId.trim();
  return normalized.length > 0 ? normalized : null;
};

type StripeWebhookRouteHandler = (request: Request) => Promise<Response>;

let cachedStripeWebhookRouteHandler: StripeWebhookRouteHandler | null = null;

const buildStripeWebhookRouteHandler = (): StripeWebhookRouteHandler => {
  const db = getDb();
  const orderRepository = new DrizzleOrderRepository(db);
  const ticketRepository = new DrizzleTicketRepository(db);
  const emailProvider = createResendEmailProvider();

  const sendOrderConfirmationEmail = createSendOrderConfirmationEmailUseCase({
    orderRepository,
    ticketRepository,
    eventRepository: new DrizzleEventRepository(db),
    userRepository: new DrizzleUserRepository(db),
    emailProvider,
  });

  const confirmOrderPayment = createConfirmOrderPaymentUseCase({
    orderRepository,
    ticketRepository,
    couponRepository: new DrizzleCouponRepository(db),
    sendOrderConfirmationEmail,
  });

  const cancelOrderOnPaymentFailure = createCancelOrderOnPaymentFailureUseCase({
    orderRepository,
    lotRepository: new DrizzleLotRepository(db),
  });

  const paymentProvider = createStripePaymentProvider();

  return async (request: Request): Promise<Response> => {
    const signature = request.headers.get("stripe-signature");

    if (typeof signature !== "string" || signature.trim().length === 0) {
      return badRequest("Missing Stripe signature");
    }

    const rawBody = await request.text();

    try {
      const event = paymentProvider.constructWebhookEvent(rawBody, signature);

      switch (event.type) {
        case "checkout.session.completed": {
          const orderId = readOrderIdFromEvent(event);
          if (orderId === null) {
            return badRequest("Missing order metadata");
          }
          await confirmOrderPayment({ orderId });
          break;
        }

        case "payment_intent.payment_failed": {
          const orderId = readOrderIdFromEvent(event);
          if (orderId === null) {
            return badRequest("Missing order metadata");
          }
          await cancelOrderOnPaymentFailure({ orderId });
          break;
        }

        default:
          break;
      }

      return withApiSecurityHeaders(Response.json({ received: true }, { status: 200 }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid Stripe signature";

      if (message.toLowerCase().includes("signature")) {
        return badRequest("Invalid Stripe signature");
      }

      const mapped = mapAppErrorToResponse(error);
      return toApiJsonResponse(mapped.status, mapped.body);
    }
  };
};

const getStripeWebhookRouteHandler = (): StripeWebhookRouteHandler => {
  if (cachedStripeWebhookRouteHandler === null) {
    cachedStripeWebhookRouteHandler = buildStripeWebhookRouteHandler();
  }

  return cachedStripeWebhookRouteHandler;
};

export const POST = async (request: Request): Promise<Response> =>
  getStripeWebhookRouteHandler()(request);
