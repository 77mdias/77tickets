import { and, asc, eq, gt, gte, ilike, isNull, lt, lte, or } from "drizzle-orm";

import type { Db } from "../infrastructure/db/client";
import { events } from "../infrastructure/db/schema";
import type { EntityId } from "./common.repository.contracts";
import type {
  EventRecord,
  EventRepository,
  ListPublishedEventsFilters,
  ListPublishedEventsPage,
} from "./event.repository.contracts";
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

  async listPublished(options?: ListPublishedEventsFilters): Promise<ListPublishedEventsPage> {
    const now = new Date();
    const conditions = [
      eq(events.status, "published"),
      or(isNull(events.endsAt), gte(events.endsAt, now)),
    ];
    const cursor = options?.cursor ? decodeCursor(options.cursor) : null;

    if (options?.q) {
      conditions.push(
        or(
          ilike(events.title, `%${options.q}%`),
          ilike(events.location, `%${options.q}%`),
        ),
      );
    }

    if (options?.date) {
      const windowStart = new Date(`${options.date}T00:00:00.000Z`);
      const windowEnd = new Date(`${options.date}T00:00:00.000Z`);
      windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);

      conditions.push(gte(events.startsAt, windowStart), lt(events.startsAt, windowEnd));
    }

    if (options?.location) {
      conditions.push(ilike(events.location, `%${options.location}%`));
    }

    if (options?.category) {
      conditions.push(eq(events.category, options.category));
    }

    if (cursor) {
      conditions.push(
        or(
          gt(events.startsAt, cursor.startsAt),
          and(eq(events.startsAt, cursor.startsAt), gt(events.id, cursor.id)),
        ),
      );
    }

    let query = this.db
      .select()
      .from(events)
      .where(and(...conditions))
      .orderBy(asc(events.startsAt), asc(events.id))
      .$dynamic();

    if (typeof options?.limit === "number") {
      query = query.limit(options.limit + 1);

      if (!options.cursor && typeof options.page === "number" && options.page > 1) {
        query = query.offset((options.page - 1) * options.limit);
      }
    }

    const rows = await query;
    const hasMore = typeof options?.limit === "number" && rows.length > options.limit;
    const items = hasMore && typeof options?.limit === "number"
      ? rows.slice(0, options.limit)
      : rows;

    return {
      items: items.map(toEventRecord),
      hasMore,
    };
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
          category: event.category ?? null,
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
            category: event.category ?? null,
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
    category: row.category,
    location: row.location,
    imageUrl: row.imageUrl,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  };
}

function decodeCursor(cursor: string): { startsAt: Date; id: string } {
  const normalized = cursor.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = JSON.parse(atob(padded)) as { startsAt: string; id: string };

  return {
    startsAt: new Date(decoded.startsAt),
    id: decoded.id,
  };
}
