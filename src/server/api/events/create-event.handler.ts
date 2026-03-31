import { createAuthorizationError } from "../../application/errors";
import type { SecurityActor } from "../../application/security";
import { mapAppErrorToResponse, type ErrorResponse } from "../error-mapper";
import { createEventSchema } from "../schemas";
import { parseInput } from "../validation";

export interface CreateEventRequest {
  actor: SecurityActor;
  body: unknown;
}

export interface CreateEventInput {
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date | null;
  imageUrl: string | null;
  actorId: string;
}

export interface CreateEventResult {
  eventId: string;
  slug: string;
  status: "draft";
}

export interface CreateEventSuccessResponse {
  status: 201;
  body: {
    data: CreateEventResult;
  };
}

export type CreateEventHandlerResponse = CreateEventSuccessResponse | ErrorResponse;

export interface CreateEventHandlerDependencies {
  createEvent: (input: CreateEventInput) => Promise<CreateEventResult>;
}

const assertCreateEventAccess = (actor: SecurityActor): void => {
  if (actor.role === "organizer" || actor.role === "admin") {
    return;
  }

  throw createAuthorizationError("Forbidden");
};

export const createCreateEventHandler = (
  dependencies: CreateEventHandlerDependencies,
) => {
  return async (
    request: CreateEventRequest,
  ): Promise<CreateEventHandlerResponse> => {
    try {
      const input = parseInput(createEventSchema, request.body);

      assertCreateEventAccess(request.actor);

      const result = await dependencies.createEvent({
        ...input,
        actorId: request.actor.userId,
      });

      return {
        status: 201,
        body: {
          data: result,
        },
      };
    } catch (error) {
      return mapAppErrorToResponse(error);
    }
  };
};
