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

  const { migrate } = await import("drizzle-orm/neon-http/migrator");
  await migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });
}
