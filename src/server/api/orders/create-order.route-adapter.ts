import { z } from "zod";

import {
  createInternalError,
  createValidationError,
  type AppErrorPayload,
} from "../../application/errors";
import {
  type CreateOrderHandlerResponse,
  type CreateOrderRequest,
} from "../create-order.handler";
import { mapAppErrorToResponse } from "../error-mapper";

const uuidSchema = z.uuid();

export const DEFAULT_DEMO_CUSTOMER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";

export interface CreateOrderRouteAdapterDependencies {
  customerId: string;
  handleCreateOrder: (request: CreateOrderRequest) => Promise<CreateOrderHandlerResponse>;
}

const toJsonResponse = (status: number, payload: { error: AppErrorPayload } | { data: unknown }) =>
  Response.json(payload, { status });

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

  return {
    customerId,
  };
};

export const createCreateOrderRouteAdapter = (
  dependencies: CreateOrderRouteAdapterDependencies,
) => async (request: Request): Promise<Response> => {
  try {
    const parsedBody = await readRequestBody(request);
    const body = mergeBodyWithServerCustomerId(parsedBody, dependencies.customerId);

    const response = await dependencies.handleCreateOrder({
      actor: {
        role: "customer",
        userId: dependencies.customerId,
      },
      body,
    });

    return toJsonResponse(response.status, response.body);
  } catch (error) {
    const mapped = mapAppErrorToResponse(error);
    return toJsonResponse(mapped.status, mapped.body);
  }
};

export const resolveDemoCustomerId = (
  customerIdFromEnv: string | undefined,
  fallback = DEFAULT_DEMO_CUSTOMER_ID,
): string => {
  const candidate = customerIdFromEnv?.trim();

  if (!candidate) {
    return fallback;
  }

  const parsed = uuidSchema.safeParse(candidate);
  return parsed.success ? parsed.data : fallback;
};

export const getDatabaseUrlOrThrow = (): string => {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw createInternalError("Database is not configured");
  }

  return databaseUrl;
};
