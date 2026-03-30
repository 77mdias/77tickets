import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { sql } from "drizzle-orm";

/**
 * globalSetup runs in a separate Node process outside of Vite's context,
 * so .env files are not loaded automatically. We load them manually here
 * before any validation, so CI env vars (already set) always take precedence.
 */
function loadEnvFile(): void {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// Reset schema: drop all application tables and ENUM types in dependency order
// so that migrations always run on a clean database. This prevents the test DB
// from getting stuck with partial migrations (e.g. FK constraint failure on
// stale data from a prior run).
async function resetSchema(db: { execute: (query: unknown) => Promise<unknown> }): Promise<void> {
  // Drop tables in reverse FK dependency order to avoid constraint errors
  const drops = [
    // Drizzle stores its migration tracking in the "drizzle" schema
    `DROP SCHEMA IF EXISTS "drizzle" CASCADE`,
    // Application tables (reverse FK dependency order)
    `DROP TABLE IF EXISTS "tickets" CASCADE`,
    `DROP TABLE IF EXISTS "order_items" CASCADE`,
    `DROP TABLE IF EXISTS "orders" CASCADE`,
    `DROP TABLE IF EXISTS "coupons" CASCADE`,
    `DROP TABLE IF EXISTS "lots" CASCADE`,
    `DROP TABLE IF EXISTS "events" CASCADE`,
    `DROP TABLE IF EXISTS "account" CASCADE`,
    `DROP TABLE IF EXISTS "session" CASCADE`,
    `DROP TABLE IF EXISTS "verification" CASCADE`,
    `DROP TABLE IF EXISTS "user" CASCADE`,
    // Custom ENUM types defined in migration 0000
    `DROP TYPE IF EXISTS "public"."event_status" CASCADE`,
    `DROP TYPE IF EXISTS "public"."lot_status" CASCADE`,
    `DROP TYPE IF EXISTS "public"."order_status" CASCADE`,
    `DROP TYPE IF EXISTS "public"."ticket_status" CASCADE`,
    `DROP TYPE IF EXISTS "public"."discount_type" CASCADE`,
  ];

  for (const statement of drops) {
    await db.execute(sql.raw(statement));
  }
}

export async function setup(): Promise<void> {
  loadEnvFile();

  const url = process.env.TEST_DATABASE_URL;

  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. " +
        "Integration tests require a separate Neon test database. " +
        "See .env.example for setup instructions.",
    );
  }

  const { createDb } = await import(
    "../../../src/server/infrastructure/db/client"
  );
  const db = createDb(url);

  try {
    await db.execute(sql`SELECT 1`);
  } catch (error) {
    throw new Error(
      `TEST_DATABASE_URL is set but the database is unreachable.\nCause: ${String(error)}`,
    );
  }

  await resetSchema(db);

  const { migrate } = await import("drizzle-orm/neon-serverless/migrator");
  await migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });
}
