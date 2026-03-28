import type { SecurityActor } from "../application/security";
import type { CreateOrderUseCase } from "../application/use-cases";

import { isAppError } from "../application/errors";
import { assertCreateOrderAccess } from "../application/security";
import { mapAppErrorToResponse, type ErrorResponse } from "./error-mapper";
import { createOrderSchema } from "./schemas";
import { parseInput } from "./validation";

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

export const createCreateOrderHandler = (
  dependencies: CreateOrderHandlerDependencies,
) => async (request: CreateOrderRequest): Promise<CreateOrderHandlerResponse> => {
  try {
    const input = parseInput(createOrderSchema, request.body);

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

    return {
      status: 200,
      body: {
        data: result,
      },
    };
  } catch (error) {
    return mapAppErrorToResponse(error);
  }
};
