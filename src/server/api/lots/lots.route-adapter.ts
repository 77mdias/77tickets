import {
  createValidationError,
  type AppErrorPayload,
} from "../../application/errors";
import type { SecurityActor } from "../../application/security";
import type {
  CreateLotHandlerResponse,
  CreateLotRequest,
} from "./create-lot.handler";
import type {
  UpdateLotHandlerResponse,
  UpdateLotRequest,
} from "./update-lot.handler";
import { mapAppErrorToResponse } from "../error-mapper";
import type { SessionContext } from "../auth";

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

const withLotId = (body: unknown, lotId: string): unknown => {
  if (typeof body === "object" && body !== null && !Array.isArray(body)) {
    return {
      ...(body as Record<string, unknown>),
      lotId,
    };
  }

  return { lotId };
};

export interface CreateLotRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handleCreateLot: (request: CreateLotRequest) => Promise<CreateLotHandlerResponse>;
}

export interface UpdateLotRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handleUpdateLot: (request: UpdateLotRequest) => Promise<UpdateLotHandlerResponse>;
}

export const createCreateLotRouteAdapter =
  (dependencies: CreateLotRouteAdapterDependencies) =>
  async (request: Request): Promise<Response> => {
    try {
      const session = await dependencies.getSession(request);
      const body = await readRequestBody(request);
      const actor: SecurityActor = {
        userId: session.userId,
        role: session.role as SecurityActor["role"],
      };
      const response = await dependencies.handleCreateLot({ actor, body });
      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };

export const createUpdateLotRouteAdapter =
  (dependencies: UpdateLotRouteAdapterDependencies) =>
  async (
    request: Request,
    context: { params: Promise<{ id: string }> },
  ): Promise<Response> => {
    try {
      const session = await dependencies.getSession(request);
      const params = await context.params;
      const body = withLotId(await readRequestBody(request), params.id);
      const actor: SecurityActor = {
        userId: session.userId,
        role: session.role as SecurityActor["role"],
      };
      const response = await dependencies.handleUpdateLot({ actor, body });
      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };
