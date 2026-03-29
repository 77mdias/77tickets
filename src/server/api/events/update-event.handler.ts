import { createNotFoundError } from "../../application/errors";
import type { SecurityActor } from "../../application/security";
import { assertEventManagementAccess } from "../../application/security";
import type { UpdateEventStatusUseCase } from "../../application/use-cases";
import type { EventRepository } from "../../repositories";
import { mapAppErrorToResponse, type ErrorResponse } from "../error-mapper";
import { updateEventSchema } from "../schemas";
import { parseInput } from "../validation";

export interface UpdateEventRequest {
  actor: SecurityActor;
  body: unknown;
}

export interface UpdateEventSuccessResponse {
  status: 200;
  body: {
    data: Awaited<ReturnType<UpdateEventStatusUseCase>>;
  };
}

export type UpdateEventHandlerResponse = UpdateEventSuccessResponse | ErrorResponse;

export interface UpdateEventHandlerDependencies {
  eventRepository: Pick<EventRepository, "findById">;
  createUpdateEventStatusForOrganizer: (
    organizerId: string,
  ) => UpdateEventStatusUseCase;
}

export const createUpdateEventHandler = (dependencies: UpdateEventHandlerDependencies) => {
  return async (request: UpdateEventRequest): Promise<UpdateEventHandlerResponse> => {
    try {
      const input = parseInput(updateEventSchema, request.body);
      const event = await dependencies.eventRepository.findById(input.eventId);

      if (!event) {
        throw createNotFoundError("Event not found");
      }

      assertEventManagementAccess({
        actor: request.actor,
        eventOrganizerId: event.organizerId,
      });

      const updateEventStatus = dependencies.createUpdateEventStatusForOrganizer(
        event.organizerId,
      );
      const result = await updateEventStatus(input);

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
};
