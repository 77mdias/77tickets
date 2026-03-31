import {
  createValidationError,
  type AppErrorPayload,
} from "../../application/errors";
import type { SecurityActor } from "../../application/security";
import type {
  CreateEventHandlerResponse,
  CreateEventRequest,
} from "./create-event.handler";
import type {
  PublishEventHandlerResponse,
  PublishEventRequest,
} from "./publish-event.handler";
import type {
  UpdateEventHandlerResponse,
  UpdateEventRequest,
} from "./update-event.handler";
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

export interface PublishEventRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handlePublishEvent: (
    request: PublishEventRequest,
  ) => Promise<PublishEventHandlerResponse>;
}

export interface CreateEventRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handleCreateEvent: (
    request: CreateEventRequest,
  ) => Promise<CreateEventHandlerResponse>;
}

export interface UpdateEventRouteAdapterDependencies {
  getSession: (request: Request) => Promise<SessionContext>;
  handleUpdateEvent: (request: UpdateEventRequest) => Promise<UpdateEventHandlerResponse>;
}

export const createCreateEventRouteAdapter =
  (dependencies: CreateEventRouteAdapterDependencies) =>
  async (request: Request): Promise<Response> => {
    try {
      const session = await dependencies.getSession(request);
      const body = await readRequestBody(request);
      const actor: SecurityActor = {
        userId: session.userId,
        role: session.role as SecurityActor["role"],
      };
      const response = await dependencies.handleCreateEvent({ actor, body });
      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };

export const createPublishEventRouteAdapter =
  (dependencies: PublishEventRouteAdapterDependencies) =>
  async (request: Request): Promise<Response> => {
    try {
      const session = await dependencies.getSession(request);
      const body = await readRequestBody(request);
      const actor: SecurityActor = {
        userId: session.userId,
        role: session.role as SecurityActor["role"],
      };
      const response = await dependencies.handlePublishEvent({ actor, body });
      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };

export const createUpdateEventRouteAdapter =
  (dependencies: UpdateEventRouteAdapterDependencies) =>
  async (request: Request): Promise<Response> => {
    try {
      const session = await dependencies.getSession(request);
      const body = await readRequestBody(request);
      const actor: SecurityActor = {
        userId: session.userId,
        role: session.role as SecurityActor["role"],
      };
      const response = await dependencies.handleUpdateEvent({ actor, body });
      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };
