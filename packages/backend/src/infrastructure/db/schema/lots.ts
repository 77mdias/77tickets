import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { events } from "./events";

export const lotStatusEnum = pgEnum("lot_status", [
  "active",
  "paused",
  "sold_out",
  "closed",
]);

export const lots = pgTable(
  "lots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    title: text("title").notNull(),
    priceInCents: integer("price_in_cents").notNull(),
    totalQuantity: integer("total_quantity").notNull(),
    availableQuantity: integer("available_quantity").notNull(),
    maxPerOrder: integer("max_per_order").notNull(),
    saleStartsAt: timestamp("sale_starts_at", { withTimezone: true }),
    saleEndsAt: timestamp("sale_ends_at", { withTimezone: true }),
    status: lotStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("lots_event_id_idx").on(table.eventId),
    index("lots_status_idx").on(table.status),
  ],
);
