import type { SecurityActor } from "../../application/security";
import type { CreateOrderUseCase } from "../../application/use-cases";

import { isAppError } from "../../application/errors";
import { assertCreateOrderAccess } from "../../application/security";
import { mapAppErrorToResponse, type ErrorResponse } from "../error-mapper";
import { createOrderSchema } from "../schemas";
import { parseInput } from "../validation";

export interface CreateOrderRequest {
  actor: SecurityActor;
  body: unknown;
}

export interface CreateOrderSuccessResponse {
  status: 200;
  body: {
    data: Awaited<ReturnType<CreateOrderUseCase>>;
  };
}

export type CreateOrderHandlerResponse = CreateOrderSuccessResponse | ErrorResponse;

export interface CheckoutAttemptTelemetryEntry {
  event: "checkout.create_order";
  outcome: "success" | "failure";
  status: number;
  errorCode: ErrorResponse["body"]["error"]["code"] | null;
  latencyMs: number;
  actorRole: SecurityActor["role"];
  eventId: string | null;
  itemsCount: number | null;
  couponApplied: boolean | null;
  timestamp: string;
}

export interface CreateOrderHandlerObservability {
  trackCheckoutAttempt(entry: CheckoutAttemptTelemetryEntry): void | Promise<void>;
}

export interface UnauthorizedCreateOrderAuditEntry {
  actorId: string;
  actorRole: SecurityActor["role"];
  targetCustomerId: string;
  eventId: string;
}

export interface CreateOrderAuditLogger {
  logUnauthorizedCreateOrderAttempt(
    entry: UnauthorizedCreateOrderAuditEntry,
  ): void | Promise<void>;
}

export interface CreateOrderHandlerDependencies {
  createOrder: CreateOrderUseCase;
  auditLogger?: CreateOrderAuditLogger;
  observability?: CreateOrderHandlerObservability;
  now?: () => Date;
  nowMs?: () => number;
}

const shouldAuditAuthorizationError = (error: unknown): boolean =>
  isAppError(error) && error.code === "authorization";

const logUnauthorizedAttempt = async (
  auditLogger: CreateOrderAuditLogger | undefined,
  request: CreateOrderRequest,
  input: {
    eventId: string;
    customerId: string;
  },
): Promise<void> => {
  if (!auditLogger) {
    return;
  }

  try {
    await auditLogger.logUnauthorizedCreateOrderAttempt({
      actorId: request.actor.userId,
      actorRole: request.actor.role,
      targetCustomerId: input.customerId,
      eventId: input.eventId,
    });
  } catch {
    // Best-effort audit logging. Authorization response must remain stable.
  }
};

interface CheckoutTelemetryContext {
  eventId: string | null;
  itemsCount: number | null;
  couponApplied: boolean | null;
}

const createDefaultTelemetryContext = (): CheckoutTelemetryContext => ({
  eventId: null,
  itemsCount: null,
  couponApplied: null,
});

const extractTelemetryContextFromInput = (input: {
  eventId: string;
  items: Array<{ lotId: string; quantity: number }>;
  couponCode?: string;
}): CheckoutTelemetryContext => ({
  eventId: input.eventId,
  itemsCount: input.items.length,
  couponApplied: input.couponCode !== undefined,
});

const getErrorCodeFromResponse = (
  response: CreateOrderHandlerResponse,
): ErrorResponse["body"]["error"]["code"] | null => {
  if (response.status === 200) {
    return null;
  }

  return response.body.error.code;
};

const trackCheckoutAttempt = async (
  observability: CreateOrderHandlerObservability | undefined,
  entry: CheckoutAttemptTelemetryEntry,
): Promise<void> => {
  if (!observability) {
    return;
  }

  try {
    await observability.trackCheckoutAttempt(entry);
  } catch {
    // Best-effort observability. Request flow must remain stable.
  }
};

export const createCreateOrderHandler = (
  dependencies: CreateOrderHandlerDependencies,
) => async (request: CreateOrderRequest): Promise<CreateOrderHandlerResponse> => {
  const now = dependencies.now ?? (() => new Date());
  const nowMs = dependencies.nowMs ?? (() => Date.now());
  const startedAtMs = nowMs();
  let telemetryContext = createDefaultTelemetryContext();

  let response: CreateOrderHandlerResponse;

  try {
    const input = parseInput(createOrderSchema, request.body);
    telemetryContext = extractTelemetryContextFromInput(input);

    try {
      assertCreateOrderAccess({
        actor: request.actor,
        targetCustomerId: input.customerId,
      });
    } catch (error) {
      if (shouldAuditAuthorizationError(error)) {
        await logUnauthorizedAttempt(dependencies.auditLogger, request, input);
      }

      throw error;
    }

    const result = await dependencies.createOrder(input);
    response = {
      status: 200,
      body: {
        data: result,
      },
    };
  } catch (error) {
    response = mapAppErrorToResponse(error);
  }

  const elapsedMs = Math.max(0, nowMs() - startedAtMs);
  const errorCode = getErrorCodeFromResponse(response);

  await trackCheckoutAttempt(dependencies.observability, {
    event: "checkout.create_order",
    outcome: response.status === 200 ? "success" : "failure",
    status: response.status,
    errorCode,
    latencyMs: elapsedMs,
    actorRole: request.actor.role,
    eventId: telemetryContext.eventId,
    itemsCount: telemetryContext.itemsCount,
    couponApplied: telemetryContext.couponApplied,
    timestamp: now().toISOString(),
  });

  return response;
};
