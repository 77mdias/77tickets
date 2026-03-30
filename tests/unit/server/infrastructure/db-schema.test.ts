import { getTableColumns, isTable } from "drizzle-orm";
import { describe, expect, test } from "vitest";

describe("schema module", () => {
  test("is importable and exports a plain object as module namespace", async () => {
    const schema = await import("../../../../src/server/infrastructure/db/schema");

    expect(schema).toBeDefined();
    expect(typeof schema).toBe("object");
  });

  test("has no forbidden infrastructure imports in contract files (regression guard)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const schemaSource = readFileSync(
      resolve(process.cwd(), "src/server/infrastructure/db/schema.ts"),
      "utf8"
    );

    expect(schemaSource).not.toContain('from "../../application');
    expect(schemaSource).not.toContain('from "../../domain');
    expect(schemaSource).not.toContain('from "../../api');
  });

  test("exports all domain aggregate tables", async () => {
    const schema = await import("../../../../src/server/infrastructure/db/schema");

    expect(isTable(schema.user)).toBe(true);
    expect(isTable(schema.session)).toBe(true);
    expect(isTable(schema.account)).toBe(true);
    expect(isTable(schema.verification)).toBe(true);
    expect(isTable(schema.events)).toBe(true);
    expect(isTable(schema.lots)).toBe(true);
    expect(isTable(schema.orders)).toBe(true);
    expect(isTable(schema.orderItems)).toBe(true);
    expect(isTable(schema.tickets)).toBe(true);
    expect(isTable(schema.coupons)).toBe(true);
  });

  test("user table has expected columns", async () => {
    const { user } = await import("../../../../src/server/infrastructure/db/schema");
    const columns = getTableColumns(user);

    expect(columns).toHaveProperty("id");
    expect(columns).toHaveProperty("name");
    expect(columns).toHaveProperty("email");
    expect(columns).toHaveProperty("emailVerified");
    expect(columns).toHaveProperty("role");
    expect(columns).toHaveProperty("createdAt");
    expect(columns).toHaveProperty("updatedAt");
  });

  test("events table has expected columns", async () => {
    const { events } = await import("../../../../src/server/infrastructure/db/schema");
    const columns = getTableColumns(events);

    expect(columns).toHaveProperty("id");
    expect(columns).toHaveProperty("organizerId");
    expect(columns).toHaveProperty("slug");
    expect(columns).toHaveProperty("title");
    expect(columns).toHaveProperty("status");
    expect(columns).toHaveProperty("startsAt");
    expect(columns).toHaveProperty("endsAt");
    expect(columns).toHaveProperty("createdAt");
  });

  test("lots table has expected columns", async () => {
    const { lots } = await import("../../../../src/server/infrastructure/db/schema");
    const columns = getTableColumns(lots);

    expect(columns).toHaveProperty("id");
    expect(columns).toHaveProperty("eventId");
    expect(columns).toHaveProperty("title");
    expect(columns).toHaveProperty("priceInCents");
    expect(columns).toHaveProperty("totalQuantity");
    expect(columns).toHaveProperty("availableQuantity");
    expect(columns).toHaveProperty("maxPerOrder");
    expect(columns).toHaveProperty("saleStartsAt");
    expect(columns).toHaveProperty("saleEndsAt");
    expect(columns).toHaveProperty("status");
  });

  test("orders table has expected columns", async () => {
    const { orders } = await import("../../../../src/server/infrastructure/db/schema");
    const columns = getTableColumns(orders);

    expect(columns).toHaveProperty("id");
    expect(columns).toHaveProperty("customerId");
    expect(columns).toHaveProperty("eventId");
    expect(columns).toHaveProperty("status");
    expect(columns).toHaveProperty("subtotalInCents");
    expect(columns).toHaveProperty("discountInCents");
    expect(columns).toHaveProperty("totalInCents");
    expect(columns).toHaveProperty("createdAt");
  });

  test("order_items table has expected columns", async () => {
    const { orderItems } = await import("../../../../src/server/infrastructure/db/schema");
    const columns = getTableColumns(orderItems);

    expect(columns).toHaveProperty("id");
    expect(columns).toHaveProperty("orderId");
    expect(columns).toHaveProperty("lotId");
    expect(columns).toHaveProperty("quantity");
    expect(columns).toHaveProperty("unitPriceInCents");
  });

  test("tickets table has expected columns", async () => {
    const { tickets } = await import("../../../../src/server/infrastructure/db/schema");
    const columns = getTableColumns(tickets);

    expect(columns).toHaveProperty("id");
    expect(columns).toHaveProperty("eventId");
    expect(columns).toHaveProperty("orderId");
    expect(columns).toHaveProperty("lotId");
    expect(columns).toHaveProperty("code");
    expect(columns).toHaveProperty("status");
    expect(columns).toHaveProperty("checkedInAt");
  });

  test("coupons table has expected columns", async () => {
    const { coupons } = await import("../../../../src/server/infrastructure/db/schema");
    const columns = getTableColumns(coupons);

    expect(columns).toHaveProperty("id");
    expect(columns).toHaveProperty("eventId");
    expect(columns).toHaveProperty("code");
    expect(columns).toHaveProperty("discountType");
    expect(columns).toHaveProperty("discountInCents");
    expect(columns).toHaveProperty("discountPercentage");
    expect(columns).toHaveProperty("maxRedemptions");
    expect(columns).toHaveProperty("redemptionCount");
    expect(columns).toHaveProperty("validFrom");
    expect(columns).toHaveProperty("validUntil");
  });
});
