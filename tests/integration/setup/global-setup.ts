import { sql } from "drizzle-orm";

export async function setup(): Promise<void> {
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
}
