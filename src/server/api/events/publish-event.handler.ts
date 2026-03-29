import { createNotFoundError } from "../../application/errors";
import type { SecurityActor } from "../../application/security";
import { assertEventManagementAccess } from "../../application/security";
import type { PublishEventUseCase } from "../../application/use-cases";
import type { EventRepository } from "../../repositories";
import { mapAppErrorToResponse, type ErrorResponse } from "../error-mapper";
import { publishEventSchema } from "../schemas";
import { parseInput } from "../validation";

export interface PublishEventRequest {
  actor: SecurityActor;
  body: unknown;
}

export interface PublishEventSuccessResponse {
  status: 200;
  body: {
    data: Awaited<ReturnType<PublishEventUseCase>>;
  };
}

export type PublishEventHandlerResponse = PublishEventSuccessResponse | ErrorResponse;

export interface PublishEventHandlerDependencies {
  eventRepository: Pick<EventRepository, "findById">;
  createPublishEventForOrganizer: (organizerId: string) => PublishEventUseCase;
}

export const createPublishEventHandler = (dependencies: PublishEventHandlerDependencies) => {
  return async (request: PublishEventRequest): Promise<PublishEventHandlerResponse> => {
    try {
      const input = parseInput(publishEventSchema, request.body);
      const event = await dependencies.eventRepository.findById(input.eventId);

      if (!event) {
        throw createNotFoundError("Event not found");
      }

      assertEventManagementAccess({
        actor: request.actor,
        eventOrganizerId: event.organizerId,
      });

      const publishEvent = dependencies.createPublishEventForOrganizer(event.organizerId);
      const result = await publishEvent(input);

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
