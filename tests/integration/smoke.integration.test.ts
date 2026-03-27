import { sql } from "drizzle-orm";
import { describe, expect, test } from "vitest";

import { cleanDatabase, createTestDb } from "./setup";

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "integration database connectivity",
  () => {
    test("TEST_DATABASE_URL points to a different database than DATABASE_URL", () => {
      expect(process.env.TEST_DATABASE_URL).not.toBe(process.env.DATABASE_URL);
    });

    test("createTestDb() returns a Drizzle instance that executes queries", async () => {
      const db = createTestDb();
      const result = await db.execute(sql`SELECT 1 AS value`);
      expect(result).toBeDefined();
    });

    test("cleanDatabase() truncates all schema tables without error", async () => {
      const db = createTestDb();
      await expect(cleanDatabase(db)).resolves.toBeUndefined();
    });
  },
);
