import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { events } from "./events";
import { lots } from "./lots";
import { orders } from "./orders";

export const ticketStatusEnum = pgEnum("ticket_status", [
  "active",
  "used",
  "cancelled",
]);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lots.id),
    code: text("code").notNull().unique(),
    status: ticketStatusEnum("status").notNull().default("active"),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  },
  (table) => [
    index("tickets_event_id_idx").on(table.eventId),
    index("tickets_order_id_idx").on(table.orderId),
    index("tickets_status_idx").on(table.status),
  ],
);
