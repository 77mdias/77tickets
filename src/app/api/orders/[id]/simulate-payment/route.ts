import {
  createConfirmOrderPaymentUseCase,
  createSendOrderConfirmationEmailUseCase,
  createSimulatePaymentUseCase,
} from "@/server/application/use-cases";
import {
  createAuthorizationError,
  createNotFoundError,
  createValidationError,
} from "@/server/application/errors";
import { mapAppErrorToResponse } from "@/server/api/error-mapper";
import { toApiJsonResponse } from "@/server/api/security-response";
import { getSession } from "@/server/infrastructure/auth";
import {
  getCouponRepository,
  getEventRepository,
  getOrderRepository,
  getTicketRepository,
  getUserRepository,
} from "@/server/composition-root";
import { createResendEmailProvider } from "@/server/email";

interface SimulatePaymentRouteParams {
  id?: string;
}

interface SimulatePaymentRouteContext {
  params: SimulatePaymentRouteParams | Promise<SimulatePaymentRouteParams>;
}

type SimulatePaymentRouteHandler = (
  request: Request,
  context: SimulatePaymentRouteContext,
) => Promise<Response>;

let cachedSimulatePaymentRouteHandler: SimulatePaymentRouteHandler | null = null;

const resolveOrderId = async (
  context: SimulatePaymentRouteContext,
): Promise<string> => {
  const params = await context.params;
  const candidate = params.id;

  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    throw createValidationError("Invalid order id", {
      details: { reason: "invalid_order_id" },
    });
  }

  return candidate.trim();
};

const buildSimulatePaymentRouteHandler = (): SimulatePaymentRouteHandler => {
  const orderRepository = getOrderRepository();
  const ticketRepository = getTicketRepository();
  const emailProvider = createResendEmailProvider();

  const sendOrderConfirmationEmail = createSendOrderConfirmationEmailUseCase({
    orderRepository,
    ticketRepository,
    eventRepository: getEventRepository(),
    userRepository: getUserRepository(),
    emailProvider,
  });

  const confirmOrderPayment = createConfirmOrderPaymentUseCase({
    orderRepository,
    ticketRepository,
    couponRepository: getCouponRepository(),
    sendOrderConfirmationEmail,
  });

  const simulatePayment = createSimulatePaymentUseCase({
    confirmOrderPayment,
  });

  return async (request, context) => {
    try {
      const session = await getSession(request);
      const orderId = await resolveOrderId(context);
      const orderWithItems = await orderRepository.findById(orderId);

      if (!orderWithItems) {
        throw createNotFoundError("Order not found", {
          details: { reason: "order_not_found" },
        });
      }

      const isAdmin = session.role === "admin";
      const isCustomerOwner =
        session.role === "customer" &&
        orderWithItems.order.customerId === session.userId;

      if (!isAdmin && !isCustomerOwner) {
        throw createAuthorizationError("Forbidden", {
          details: { reason: "simulate_payment_forbidden" },
        });
      }

      const result = await simulatePayment({ orderId });
      return toApiJsonResponse(200, { data: result });
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toApiJsonResponse(mapped.status, mapped.body);
    }
  };
};

const getSimulatePaymentRouteHandler = (): SimulatePaymentRouteHandler => {
  if (!cachedSimulatePaymentRouteHandler) {
    cachedSimulatePaymentRouteHandler = buildSimulatePaymentRouteHandler();
  }

  return cachedSimulatePaymentRouteHandler;
};

export const POST = async (
  request: Request,
  context: SimulatePaymentRouteContext,
): Promise<Response> => getSimulatePaymentRouteHandler()(request, context);
