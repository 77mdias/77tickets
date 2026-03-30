import type { EntityId } from "./common.repository.contracts";
import type { EventLifecycleStatus } from "../domain/events";

export type { EventLifecycleStatus };

export interface EventRecord {
  id: EntityId;
  organizerId: EntityId;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  imageUrl: string | null;
  status: EventLifecycleStatus;
  startsAt: Date;
  endsAt: Date | null;
}

export interface EventRepository {
  findById(eventId: EntityId): Promise<EventRecord | null>;
  findPublishedBySlug(slug: string): Promise<EventRecord | null>;
  listPublished(options?: { limit?: number; offset?: number }): Promise<EventRecord[]>;
  listByOrganizer(organizerId: EntityId): Promise<EventRecord[]>;
  save(event: EventRecord): Promise<void>;
}
