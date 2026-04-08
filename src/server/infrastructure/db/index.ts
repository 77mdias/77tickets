export { createDb, createHttpDb } from "./client";
export type { Db, HttpDb } from "./client";

import { createDb, createHttpDb, type Db, type HttpDb } from "./client";
import { validateRequiredEnvVars } from "../env/validate";

const getDatabaseUrl = (): string => {
  validateRequiredEnvVars();
  const url = (process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL)?.trim();
  if (!url) throw new Error("DATABASE_URL environment variable is required");
  return url;
};

let cachedDb: Db | null = null;

export const getDb = (): Db => {
  if (!cachedDb) {
    cachedDb = createDb(getDatabaseUrl());
  }
  return cachedDb;
};

let cachedHttpDb: HttpDb | null = null;

/** HTTP-transport singleton — safe for auth and non-transactional queries. */
export const getHttpDb = (): HttpDb => {
  if (!cachedHttpDb) {
    cachedHttpDb = createHttpDb(getDatabaseUrl());
  }
  return cachedHttpDb;
};
