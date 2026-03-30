export { createDb } from "./client";
export type { Db } from "./client";

import { createDb, type Db } from "./client";

const getDatabaseUrl = (): string => {
  const url = (process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL)?.trim();
  if (!url) throw new Error("DATABASE_URL environment variable is required");
  return url;
};

export const db: Db = createDb(getDatabaseUrl());
