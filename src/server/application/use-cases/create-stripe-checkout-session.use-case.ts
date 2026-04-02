import { createAuthorizationError, createConflictError, createNotFoundError } from "../errors";
import type { OrderRepository } from "../../repositories";
import type { PaymentProvider } from "../../payment/payment.provider";

export interface CreateStripeCheckoutSessionInput {
  orderId: string;
  customerId: string;
}

export interface CreateStripeCheckoutSessionResult {
  checkoutUrl: string;
}

export interface CreateStripeCheckoutSessionUseCaseDependencies {
  orderRepository: Pick<OrderRepository, "findById">;
  paymentProvider: Pick<PaymentProvider, "createCheckoutSession">;
}

export type CreateStripeCheckoutSessionUseCase = (
  input: CreateStripeCheckoutSessionInput,
) => Promise<CreateStripeCheckoutSessionResult>;

export const createCreateStripeCheckoutSessionUseCase = (
  dependencies: CreateStripeCheckoutSessionUseCaseDependencies,
): CreateStripeCheckoutSessionUseCase => {
  return async (input) => {
    const orderWithItems = await dependencies.orderRepository.findById(input.orderId);

    if (!orderWithItems) {
      throw createNotFoundError("Order not found", { details: { reason: "order_not_found" } });
    }

    if (orderWithItems.order.customerId !== input.customerId) {
      throw createAuthorizationError("Forbidden", { details: { reason: "order_customer_mismatch" } });
    }

    if (orderWithItems.order.status !== "pending") {
      throw createConflictError("Order cannot start checkout", {
        details: {
          reason: "order_not_pending",
        },
      });
    }

    const { checkoutUrl } = await dependencies.paymentProvider.createCheckoutSession({
      order: {
        id: orderWithItems.order.id,
        customerId: orderWithItems.order.customerId,
        eventId: orderWithItems.order.eventId,
        status: orderWithItems.order.status,
        totalInCents: orderWithItems.order.totalInCents,
      },
      items: orderWithItems.items,
    });

    return { checkoutUrl };
  };
};
