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

export interface ValidateCheckinRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handleValidateCheckin: (
    request: ValidateCheckinRequest,
  ) => Promise<ValidateCheckinHandlerResponse>;
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

export const createValidateCheckinRouteAdapter = (
  dependencies: ValidateCheckinRouteAdapterDependencies,
) =>
  async (request: Request): Promise<Response> => {
    try {
      const session = await dependencies.getSession(request);
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
