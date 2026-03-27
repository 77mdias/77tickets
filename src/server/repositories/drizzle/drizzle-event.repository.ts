import { and, eq } from "drizzle-orm";

import type { Db } from "../../infrastructure/db/client";
import { events } from "../../infrastructure/db/schema";
import type { EntityId } from "../common.repository.contracts";
import type { EventRecord, EventRepository } from "../event.repository.contracts";
import { mapPersistenceError } from "./map-persistence-error";

export class DrizzleEventRepository implements EventRepository {
  constructor(private readonly db: Db) {}

  async findById(eventId: EntityId): Promise<EventRecord | null> {
    const [row] = await this.db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    return row ? toEventRecord(row) : null;
  }

  async findPublishedBySlug(slug: string): Promise<EventRecord | null> {
    const [row] = await this.db
      .select()
      .from(events)
      .where(and(eq(events.slug, slug), eq(events.status, "published")))
      .limit(1);

    return row ? toEventRecord(row) : null;
  }

  async listByOrganizer(organizerId: EntityId): Promise<EventRecord[]> {
    const rows = await this.db
      .select()
      .from(events)
      .where(eq(events.organizerId, organizerId));

    return rows.map(toEventRecord);
  }

  async save(event: EventRecord): Promise<void> {
    try {
      await this.db
        .insert(events)
        .values({
          id: event.id,
          organizerId: event.organizerId,
          slug: event.slug,
          title: event.title,
          status: event.status,
          startsAt: event.startsAt,
          endsAt: event.endsAt ?? new Date("9999-12-31T00:00:00Z"),
        })
        .onConflictDoUpdate({
          target: events.id,
          set: {
            slug: event.slug,
            title: event.title,
            status: event.status,
            startsAt: event.startsAt,
            endsAt: event.endsAt ?? new Date("9999-12-31T00:00:00Z"),
          },
        });
    } catch (error) {
      throw mapPersistenceError(error, "save event");
    }
  }
}

function toEventRecord(row: typeof events.$inferSelect): EventRecord {
  return {
    id: row.id,
    organizerId: row.organizerId,
    slug: row.slug,
    title: row.title,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  };
}
