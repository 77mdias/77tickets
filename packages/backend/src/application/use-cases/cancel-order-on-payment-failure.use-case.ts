import { createConflictError, createNotFoundError } from "../errors";
import type { LotRepository, OrderRepository } from "../../repositories";

export interface CancelOrderOnPaymentFailureInput {
  orderId: string;
}

export interface CancelOrderOnPaymentFailureResult {
  outcome: "cancelled" | "already_cancelled";
}

export interface CancelOrderOnPaymentFailureUseCaseDependencies {
  orderRepository: Pick<OrderRepository, "findById" | "updateStatusIfCurrent">;
  lotRepository: Pick<LotRepository, "incrementAvailableQuantity">;
}

export type CancelOrderOnPaymentFailureUseCase = (
  input: CancelOrderOnPaymentFailureInput,
) => Promise<CancelOrderOnPaymentFailureResult>;

const createOrderStatusConflict = (status: string) =>
  createConflictError("Order cannot be cancelled", {
    details: {
      reason: "invalid_order_status",
      status,
    },
  });

export const createCancelOrderOnPaymentFailureUseCase = (
  dependencies: CancelOrderOnPaymentFailureUseCaseDependencies,
): CancelOrderOnPaymentFailureUseCase => {
  return async (input) => {
    const orderWithItems = await dependencies.orderRepository.findById(input.orderId);

    if (orderWithItems === null) {
      throw createNotFoundError("Order not found", { details: { reason: "order_not_found" } });
    }

    if (orderWithItems.order.status === "cancelled") {
      return { outcome: "already_cancelled" };
    }

    if (orderWithItems.order.status !== "pending") {
      throw createOrderStatusConflict(orderWithItems.order.status);
    }

    const updated = await dependencies.orderRepository.updateStatusIfCurrent(
      orderWithItems.order.id,
      "pending",
      "cancelled",
    );

    if (updated === false) {
      const refreshed = await dependencies.orderRepository.findById(orderWithItems.order.id);

      if (refreshed?.order.status === "cancelled") {
        return { outcome: "already_cancelled" };
      }

      throw createConflictError("Order cancellation race detected", {
        details: { reason: "order_transition_failed" },
      });
    }

    for (const item of orderWithItems.items) {
      await dependencies.lotRepository.incrementAvailableQuantity(item.lotId, item.quantity);
    }

    return { outcome: "cancelled" };
  };
};
