import {
  createInternalError,
  createValidationError,
  type AppErrorPayload,
} from "../../application/errors";
import type {
  ValidateCheckinHandlerResponse,
  ValidateCheckinRequest,
} from "./validate-checkin.handler";
import { mapAppErrorToResponse } from "../error-mapper";
import type { SessionContext } from "../auth";
import type { SecurityActor } from "../../application/security";
import { enforceRateLimit } from "../middleware";
import type { RateLimiterResult } from "../middleware/rate-limiter";
import { toApiJsonResponse } from "../security-response";

export interface ValidateCheckinRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handleValidateCheckin: (
    request: ValidateCheckinRequest,
  ) => Promise<ValidateCheckinHandlerResponse>;
  checkRateLimit?: (clientKey: string) => RateLimiterResult;
  rateLimitMaxRequests?: number;
}

const toJsonResponse = (
  status: number,
  payload: { error: AppErrorPayload } | { data: unknown },
) => toApiJsonResponse(status, payload);

const readRequestBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    throw createValidationError("Invalid request payload");
  }
};

export const createValidateCheckinRouteAdapter = (
  dependencies: ValidateCheckinRouteAdapterDependencies,
) =>
  async (request: Request): Promise<Response> => {
    try {
      const session = await dependencies.getSession(request);

      if (dependencies.checkRateLimit) {
        enforceRateLimit({
          request,
          scope: "checkin:validate",
          userId: session.userId,
          maxRequests: dependencies.rateLimitMaxRequests ?? 60,
          checkRateLimit: dependencies.checkRateLimit,
        });
      }

      const body = await readRequestBody(request);

      const response = await dependencies.handleValidateCheckin({
        actor: {
          role: session.role as SecurityActor["role"],
          userId: session.userId,
        },
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
