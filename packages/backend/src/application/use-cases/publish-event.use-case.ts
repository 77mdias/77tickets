import type { PublishEventInput, PublishEventResult } from "../events";
import { createAuthorizationError, createConflictError, createNotFoundError } from "../errors";
import type { EventRepository } from "../../repositories";
import type { LotRepository } from "../../repositories";

export type PublishEventUseCase = (input: PublishEventInput) => Promise<PublishEventResult>;

export interface PublishEventUseCaseEventPublishedEntry {
  eventId: string;
  organizerId: string;
  timestamp: string;
}

export interface PublishEventUseCaseObservability {
  logEventPublished(entry: PublishEventUseCaseEventPublishedEntry): void | Promise<void>;
}

export interface PublishEventUseCaseDependencies {
  organizerId: string;
  eventRepository: Pick<EventRepository, "findById" | "save">;
  lotRepository: Pick<LotRepository, "findByEventId">;
  observability?: PublishEventUseCaseObservability;
}

const createPublishConflictError = (reason: string) =>
  createConflictError("Publish event conflict", { details: { reason } });

export function createPublishEventUseCase(
  dependencies: PublishEventUseCaseDependencies,
): PublishEventUseCase {
  return async function publishEvent(input: PublishEventInput): Promise<PublishEventResult> {
    const { organizerId, eventRepository, lotRepository, observability } = dependencies;
    const { eventId } = input;

    const event = await eventRepository.findById(eventId);

    if (!event) {
      throw createNotFoundError("Event not found");
    }

    if (event.organizerId !== organizerId) {
      throw createAuthorizationError("Forbidden", {
        details: { reason: "ownership_violation" },
      });
    }

    if (event.status === "published") {
      throw createPublishConflictError("event_already_published");
    }

    if (event.status === "cancelled") {
      throw createPublishConflictError("event_cancelled");
    }

    const lots = await lotRepository.findByEventId(eventId);

    if (lots.length === 0) {
      throw createPublishConflictError("no_lots");
    }

    const hasAnySaleWindow = lots.some((lot) => lot.saleStartsAt !== null);
    if (!hasAnySaleWindow) {
      throw createPublishConflictError("no_sale_window");
    }

    await eventRepository.save({ ...event, status: "published" });

    if (observability) {
      try {
        await observability.logEventPublished({
          eventId,
          organizerId,
          timestamp: new Date().toISOString(),
        });
      } catch {
        // best-effort: logging must not break the flow
      }
    }

    return { eventId, status: "published" };
  };
}
