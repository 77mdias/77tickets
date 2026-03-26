import type { EntityId } from "./common.repository.contracts";

export type EventLifecycleStatus = "draft" | "published" | "cancelled";

export interface EventRecord {
  id: EntityId;
  organizerId: EntityId;
  slug: string;
  title: string;
  status: EventLifecycleStatus;
  startsAt: Date;
  endsAt: Date | null;
}

export interface EventRepository {
  findById(eventId: EntityId): Promise<EventRecord | null>;
  findPublishedBySlug(slug: string): Promise<EventRecord | null>;
  listByOrganizer(organizerId: EntityId): Promise<EventRecord[]>;
  save(event: EventRecord): Promise<void>;
}
