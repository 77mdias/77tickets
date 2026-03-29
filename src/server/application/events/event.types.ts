import type { EventLifecycleStatus } from "../../domain/events";

export interface PublishEventInput {
  eventId: string;
}

export interface PublishEventResult {
  eventId: string;
  status: "published";
}

export interface UpdateEventStatusInput {
  eventId: string;
  targetStatus: EventLifecycleStatus;
}

export interface UpdateEventStatusResult {
  eventId: string;
  status: EventLifecycleStatus;
}
