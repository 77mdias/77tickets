import { createConflictError, createNotFoundError } from "../errors";
import type { CouponRepository, OrderRepository, TicketRepository } from "../../repositories";

export interface ConfirmOrderPaymentInput {
  orderId: string;
}

export interface ConfirmOrderPaymentResult {
  outcome: "confirmed" | "already_paid";
}

export interface ConfirmOrderPaymentUseCaseDependencies {
  orderRepository: Pick<OrderRepository, "findById" | "updateStatusIfCurrent">;
  ticketRepository: Pick<TicketRepository, "activateByOrderId">;
  couponRepository: Pick<CouponRepository, "incrementRedemptionCount">;
  sendOrderConfirmationEmail?: (input: { orderId: string }) => Promise<void>;
}

export type ConfirmOrderPaymentUseCase = (
  input: ConfirmOrderPaymentInput,
) => Promise<ConfirmOrderPaymentResult>;

const createOrderStatusConflict = (status: string) =>
  createConflictError("Order cannot be confirmed", {
    details: {
      reason: "invalid_order_status",
      status,
    },
  });

export const createConfirmOrderPaymentUseCase = (
  dependencies: ConfirmOrderPaymentUseCaseDependencies,
): ConfirmOrderPaymentUseCase => {
  return async (input) => {
    const orderWithItems = await dependencies.orderRepository.findById(input.orderId);

    if (orderWithItems === null) {
      throw createNotFoundError("Order not found", { details: { reason: "order_not_found" } });
    }

    if (orderWithItems.order.status === "paid") {
      return { outcome: "already_paid" };
    }

    if (orderWithItems.order.status !== "pending") {
      throw createOrderStatusConflict(orderWithItems.order.status);
    }

    const updated = await dependencies.orderRepository.updateStatusIfCurrent(
      orderWithItems.order.id,
      "pending",
      "paid",
    );

    if (updated === false) {
      const refreshed = await dependencies.orderRepository.findById(orderWithItems.order.id);

      if (refreshed?.order.status === "paid") {
        return { outcome: "already_paid" };
      }

      throw createConflictError("Order confirmation race detected", {
        details: { reason: "order_transition_failed" },
      });
    }

    await dependencies.ticketRepository.activateByOrderId(orderWithItems.order.id);

    if (orderWithItems.order.couponId !== null && orderWithItems.order.couponId !== undefined) {
      await dependencies.couponRepository.incrementRedemptionCount(orderWithItems.order.couponId);
    }

    if (dependencies.sendOrderConfirmationEmail) {
      void dependencies
        .sendOrderConfirmationEmail({ orderId: orderWithItems.order.id })
        .catch(() => undefined);
    }

    return { outcome: "confirmed" };
  };
};
