import { createAuthorizationError } from "../errors";
import type { ConfirmOrderPaymentUseCase } from "./confirm-order-payment.use-case";

export interface SimulatePaymentInput {
  orderId: string;
}

export interface SimulatePaymentResult {
  outcome: string;
}

export interface SimulatePaymentUseCaseDependencies {
  paymentMode?: () => string;
  getPaymentMode?: () => string;
  confirmOrderPayment: ConfirmOrderPaymentUseCase;
}

export type SimulatePaymentUseCase = (
  input: SimulatePaymentInput,
) => Promise<SimulatePaymentResult>;

const normalizePaymentMode = (value: string): string => value.trim().toLowerCase();

export const createSimulatePaymentUseCase = (
  dependencies: SimulatePaymentUseCaseDependencies,
): SimulatePaymentUseCase => {
  const getPaymentMode =
    dependencies.getPaymentMode ??
    dependencies.paymentMode ??
    (() => process.env.PAYMENT_MODE ?? "demo");

  return async (input) => {
    const paymentMode = normalizePaymentMode(getPaymentMode());

    if (paymentMode !== "demo") {
      throw createAuthorizationError("Forbidden", {
        details: {
          reason: "payment_mode_not_demo",
          paymentMode,
        },
      });
    }

    return dependencies.confirmOrderPayment({ orderId: input.orderId });
  };
};
