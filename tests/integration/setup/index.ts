import { getTableName, isTable, sql } from "drizzle-orm";

import {
  createDb,
  type Db,
} from "../../../src/server/infrastructure/db/client";
import * as schema from "../../../src/server/infrastructure/db/schema";

export function createTestDb(): Db {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL must be set to run integration tests.");
  }
  return createDb(url);
}

export async function cleanDatabase(db: Db): Promise<void> {
  const tables = Object.values(schema).filter(isTable);
  if (tables.length === 0) return;
  const tableNames = tables.map((t) => `"${getTableName(t)}"`).join(", ");
  // sql.raw() is required here: tagged template would quote the string as a parameter.
  // Table names come from getTableName() (compile-time schema), not user input.
  await db.execute(sql.raw(`TRUNCATE ${tableNames} RESTART IDENTITY CASCADE`));
}
