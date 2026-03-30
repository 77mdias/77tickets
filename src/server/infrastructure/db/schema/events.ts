import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./users";

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "published",
  "cancelled",
]);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => user.id),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    imageUrl: text("image_url"),
    status: eventStatusEnum("status").notNull().default("draft"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("events_organizer_id_idx").on(table.organizerId),
    index("events_status_idx").on(table.status),
  ],
);
