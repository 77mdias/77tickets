import type { UpdateEventStatusInput, UpdateEventStatusResult } from "../events";
import { createConflictError, createNotFoundError } from "../errors";
import type { EventRepository } from "../../repositories";

export type UpdateEventStatusUseCase = (
  input: UpdateEventStatusInput,
) => Promise<UpdateEventStatusResult>;

export interface UpdateEventStatusUseCaseDependencies {
  eventRepository: Pick<EventRepository, "findById" | "save">;
}

const createUpdateEventConflictError = (reason: string) =>
  createConflictError("Update event conflict", { details: { reason } });

export const createUpdateEventStatusUseCase = (
  dependencies: UpdateEventStatusUseCaseDependencies,
): UpdateEventStatusUseCase => {
  return async (input: UpdateEventStatusInput): Promise<UpdateEventStatusResult> => {
    const event = await dependencies.eventRepository.findById(input.eventId);

    if (!event) {
      throw createNotFoundError("Event not found");
    }

    if (event.status === "cancelled") {
      throw createUpdateEventConflictError("event_already_cancelled");
    }

    if (input.targetStatus === "published") {
      throw createUpdateEventConflictError("publish_requires_publish_endpoint");
    }

    if (input.targetStatus !== "cancelled") {
      throw createUpdateEventConflictError("invalid_transition");
    }

    await dependencies.eventRepository.save({
      ...event,
      status: "cancelled",
    });

    return {
      eventId: event.id,
      status: "cancelled",
    };
  };
};
