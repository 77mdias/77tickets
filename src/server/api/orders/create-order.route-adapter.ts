import {
  createInternalError,
  createValidationError,
  type AppErrorPayload,
} from "../../application/errors";
import type {
  CreateOrderHandlerResponse,
  CreateOrderRequest,
} from "../create-order.handler";
import { mapAppErrorToResponse } from "../error-mapper";
import type { SessionContext } from "../auth";
import type { SecurityActor } from "../../application/security";

export interface CreateOrderRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handleCreateOrder: (request: CreateOrderRequest) => Promise<CreateOrderHandlerResponse>;
}

const toJsonResponse = (
  status: number,
  payload: { error: AppErrorPayload } | { data: unknown },
) => Response.json(payload, { status });

const readRequestBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    throw createValidationError("Invalid request payload");
  }
};

const mergeBodyWithServerCustomerId = (body: unknown, customerId: string): unknown => {
  if (typeof body === "object" && body !== null && !Array.isArray(body)) {
    return {
      ...(body as Record<string, unknown>),
      customerId,
    };
  }
  return { customerId };
};

export const createCreateOrderRouteAdapter = (
  dependencies: CreateOrderRouteAdapterDependencies,
) =>
  async (request: Request): Promise<Response> => {
    try {
      const session = await dependencies.getSession(request);
      const parsedBody = await readRequestBody(request);
      const body = mergeBodyWithServerCustomerId(parsedBody, session.userId);

      const response = await dependencies.handleCreateOrder({
        actor: { role: session.role as SecurityActor["role"], userId: session.userId },
        body,
      });

      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };

export const getDatabaseUrlOrThrow = (): string => {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw createInternalError("Database is not configured");
  }

  return databaseUrl;
};
