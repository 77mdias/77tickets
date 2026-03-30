import { index, integer, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./users";
import { events } from "./events";
import { lots } from "./lots";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "expired",
  "cancelled",
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => user.id),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    status: orderStatusEnum("status").notNull().default("pending"),
    subtotalInCents: integer("subtotal_in_cents").notNull(),
    discountInCents: integer("discount_in_cents").notNull().default(0),
    totalInCents: integer("total_in_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("orders_customer_id_idx").on(table.customerId),
    index("orders_event_id_idx").on(table.eventId),
    index("orders_status_idx").on(table.status),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lots.id),
    quantity: integer("quantity").notNull(),
    unitPriceInCents: integer("unit_price_in_cents").notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
  ],
);
