import { z } from "zod";

import {
  createValidationError,
  type AppErrorPayload,
} from "../../application/errors";
import type { SecurityActor } from "../../application/security";
import type {
  PublishEventHandlerResponse,
  PublishEventRequest,
} from "./publish-event.handler";
import type {
  UpdateEventHandlerResponse,
  UpdateEventRequest,
} from "./update-event.handler";
import { mapAppErrorToResponse } from "../error-mapper";
import { parseInput } from "../validation";

const actorSchema: z.ZodType<SecurityActor> = z
  .object({
    userId: z.uuid(),
    role: z.enum(["organizer", "admin"]),
  })
  .strict();

const toJsonResponse = (status: number, payload: { error: AppErrorPayload } | { data: unknown }) =>
  Response.json(payload, { status });

const readRequestBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    throw createValidationError("Invalid request payload");
  }
};

const readActorFromHeaders = (headers: Headers): SecurityActor => {
  return parseInput(actorSchema, {
    userId: headers.get("x-actor-id"),
    role: headers.get("x-actor-role"),
  });
};

export interface PublishEventRouteAdapterDependencies {
  handlePublishEvent: (
    request: PublishEventRequest,
  ) => Promise<PublishEventHandlerResponse>;
}

export interface UpdateEventRouteAdapterDependencies {
  handleUpdateEvent: (request: UpdateEventRequest) => Promise<UpdateEventHandlerResponse>;
}

export const createPublishEventRouteAdapter =
  (dependencies: PublishEventRouteAdapterDependencies) =>
  async (request: Request): Promise<Response> => {
    try {
      const actor = readActorFromHeaders(request.headers);
      const body = await readRequestBody(request);
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
      const actor = readActorFromHeaders(request.headers);
      const body = await readRequestBody(request);
      const response = await dependencies.handleUpdateEvent({ actor, body });

      return toJsonResponse(response.status, response.body);
    } catch (error) {
      const mapped = mapAppErrorToResponse(error);
      return toJsonResponse(mapped.status, mapped.body);
    }
  };
