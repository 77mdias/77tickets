import { index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { events } from "./events";

export const discountTypeEnum = pgEnum("discount_type", ["fixed", "percentage"]);

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    code: text("code").notNull(),
    discountType: discountTypeEnum("discount_type").notNull(),
    discountInCents: integer("discount_in_cents"),
    discountPercentage: integer("discount_percentage"),
    maxRedemptions: integer("max_redemptions").notNull(),
    redemptionCount: integer("redemption_count").notNull().default(0),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("coupons_event_code_unique").on(table.eventId, table.code),
    index("coupons_event_id_idx").on(table.eventId),
  ],
);
