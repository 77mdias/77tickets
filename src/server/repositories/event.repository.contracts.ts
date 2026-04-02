import type { EntityId } from "./common.repository.contracts";
import type { EventLifecycleStatus } from "../domain/events";

export type { EventLifecycleStatus };

export interface EventRecord {
  id: EntityId;
  organizerId: EntityId;
  slug: string;
  title: string;
  description: string | null;
  category?: string | null;
  location: string | null;
  imageUrl: string | null;
  status: EventLifecycleStatus;
  startsAt: Date;
  endsAt: Date | null;
}

export interface ListPublishedEventsFilters {
  q?: string;
  date?: string;
  location?: string;
  category?: string;
  cursor?: string;
  page?: number;
  limit?: number;
}

export interface ListPublishedEventsPage {
  items: EventRecord[];
  hasMore: boolean;
}

export interface EventRepository {
  findById(eventId: EntityId): Promise<EventRecord | null>;
  findBySlug(slug: string): Promise<EventRecord | null>;
  findPublishedBySlug(slug: string): Promise<EventRecord | null>;
  listStartingBetween(windowStart: Date, windowEnd: Date): Promise<EventRecord[]>;
  listPublished(options?: ListPublishedEventsFilters): Promise<ListPublishedEventsPage>;
  listByOrganizer(organizerId: EntityId): Promise<EventRecord[]>;
  save(event: EventRecord): Promise<void>;
}
