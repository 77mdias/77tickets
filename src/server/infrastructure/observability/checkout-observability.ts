import type { CheckoutAttemptTelemetryEntry } from "../../api/create-order.handler";
import type { CreateOrderUseCaseTelemetryEntry } from "../../application/use-cases/create-order.use-case";

interface CheckoutObservabilityLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
}

export interface ConsoleCheckoutObservabilityDependencies {
  logger?: CheckoutObservabilityLogger;
}

const logStructuredEvent = (
  logger: CheckoutObservabilityLogger,
  label: string,
  entry: unknown,
  outcome: "success" | "failure",
): void => {
  const method = outcome === "success" ? logger.info : logger.warn;
  method(label, JSON.stringify(entry));
};

export const createConsoleCheckoutObservability = (
  dependencies: ConsoleCheckoutObservabilityDependencies = {},
) => {
  const logger = dependencies.logger ?? console;

  return {
    trackCheckoutAttempt: (entry: CheckoutAttemptTelemetryEntry): void => {
      logStructuredEvent(logger, "[checkout-observability][api]", entry, entry.outcome);
    },
    trackCreateOrderExecution: (entry: CreateOrderUseCaseTelemetryEntry): void => {
      logStructuredEvent(logger, "[checkout-observability][use-case]", entry, entry.outcome);
    },
  };
};
