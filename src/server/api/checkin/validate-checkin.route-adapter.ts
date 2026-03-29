import { z } from "zod";

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

const uuidSchema = z.uuid();

export const DEFAULT_DEMO_CHECKER_ID = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";

export interface ValidateCheckinRouteAdapterDependencies {
  checkerId: string;
  handleValidateCheckin: (
    request: ValidateCheckinRequest,
  ) => Promise<ValidateCheckinHandlerResponse>;
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

export const createValidateCheckinRouteAdapter = (
  dependencies: ValidateCheckinRouteAdapterDependencies,
) => async (request: Request): Promise<Response> => {
  try {
    const body = await readRequestBody(request);

    const response = await dependencies.handleValidateCheckin({
      actor: {
        role: "checker",
        userId: dependencies.checkerId,
      },
      body,
    });

    return toJsonResponse(response.status, response.body);
  } catch (error) {
    const mapped = mapAppErrorToResponse(error);
    return toJsonResponse(mapped.status, mapped.body);
  }
};

export const resolveDemoCheckerId = (
  checkerIdFromEnv: string | undefined,
  fallback = DEFAULT_DEMO_CHECKER_ID,
): string => {
  const candidate = checkerIdFromEnv?.trim();

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
