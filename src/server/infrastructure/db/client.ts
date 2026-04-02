/**
 * Database clients for Cloudflare Workers (and standard Node.js).
 *
 * WHY @neondatabase/serverless instead of `pg` / `postgres`:
 *   Regular Node.js drivers (`pg`, `postgres`) open TCP connections, which are
 *   NOT available in the Cloudflare Workers runtime. `@neondatabase/serverless`
 *   communicates over WebSocket (or HTTP), both of which are supported natively
 *   in Workers.
 *
 * TWO transport modes — use the right one for the job:
 *
 *   HTTP mode  (`createHttpDb`) — `neon()` + `drizzle-orm/neon-http`
 *     Stateless per-query HTTP request. No persistent connection to lose.
 *     Immune to Neon auto-suspend "Connection terminated" errors.
 *     Does NOT support multi-statement transactions.
 *     Use for: Better Auth (session/user queries), any non-transactional read.
 *
 *   WebSocket mode (`createDb`) — `Pool` + `drizzle-orm/neon-serverless`
 *     Persistent WebSocket connection. Supports `db.transaction()`.
 *     Can fail with "Connection terminated" if Neon suspends the idle pool.
 *     Use only where `db.transaction()` is required (e.g. OrderRepository.create).
 *
 * Workers-compatible: yes  (both WebSocket and HTTP are natively supported)
 * Node-only APIs used: none
 */
import { neon, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "./schema";

/** HTTP-transport client — use for non-transactional queries (e.g. Better Auth). */
export function createHttpDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzleHttp(sql, { schema });
}

/** WebSocket-transport client — use only where db.transaction() is needed. */
export function createDb(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema });
}

export type HttpDb = ReturnType<typeof createHttpDb>;
export type Db = ReturnType<typeof createDb>;
