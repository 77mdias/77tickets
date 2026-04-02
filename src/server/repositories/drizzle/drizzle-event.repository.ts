import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm";

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

  async findBySlug(slug: string): Promise<EventRecord | null> {
    const [row] = await this.db
      .select()
      .from(events)
      .where(eq(events.slug, slug))
      .limit(1);

    return row ? toEventRecord(row) : null;
  }

  async listPublished(options?: {
    limit?: number;
    offset?: number;
  }): Promise<EventRecord[]> {
    const now = new Date();
    let query = this.db
      .select()
      .from(events)
      .where(
        and(
          eq(events.status, "published"),
          or(isNull(events.endsAt), gte(events.endsAt, now)),
        ),
      )
      .orderBy(asc(events.startsAt), asc(events.id))
      .$dynamic();

    if (typeof options?.limit === "number") {
      query = query.limit(options.limit);
    }

    if (typeof options?.offset === "number") {
      query = query.offset(options.offset);
    }

    const rows = await query;

    return rows.map(toEventRecord);
  }

  async listStartingBetween(windowStart: Date, windowEnd: Date): Promise<EventRecord[]> {
    const rows = await this.db
      .select()
      .from(events)
      .where(
        and(
          eq(events.status, "published"),
          gte(events.startsAt, windowStart),
          lte(events.startsAt, windowEnd),
        ),
      )
      .orderBy(asc(events.startsAt), asc(events.id));

    return rows.map(toEventRecord);
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
          description: event.description,
          location: event.location,
          imageUrl: event.imageUrl,
          status: event.status,
          startsAt: event.startsAt,
          endsAt: event.endsAt ?? new Date("9999-12-31T00:00:00Z"),
        })
        .onConflictDoUpdate({
          target: events.id,
          set: {
            slug: event.slug,
            title: event.title,
            description: event.description,
            location: event.location,
            imageUrl: event.imageUrl,
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
    description: row.description,
    location: row.location,
    imageUrl: row.imageUrl,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  };
}
