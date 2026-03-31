/**
 * Database client for Cloudflare Workers (and standard Node.js).
 *
 * WHY @neondatabase/serverless instead of `pg` / `postgres`:
 *   Regular Node.js drivers (`pg`, `postgres`) open TCP connections, which are
 *   NOT available in the Cloudflare Workers runtime. `@neondatabase/serverless`
 *   communicates over WebSocket (or HTTP), both of which are supported natively
 *   in Workers.
 *
 * WHY Pool (WebSocket) instead of HTTP mode:
 *   `@neondatabase/serverless` supports two transport modes:
 *   - HTTP mode  — `neon()` function + `drizzle-orm/neon-http`
 *                  Simpler, lower-latency for single queries, but does NOT
 *                  support transactions.
 *   - WebSocket mode — `Pool` + `drizzle-orm/neon-serverless` (this file)
 *                  Supports full transaction semantics via `db.transaction()`.
 *
 *   We must use WebSocket (Pool) mode because `DrizzleOrderRepository.create()`
 *   wraps the order + order-items + tickets inserts in a single transaction to
 *   guarantee atomicity. Switching to HTTP mode would silently break that
 *   invariant.
 *
 * Workers-compatible: yes  (WebSocket is supported natively in Workers runtime)
 * Node-only APIs used: none  (no `net`, `fs`, `child_process`, or `node:*` imports)
 */
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "./schema";

export function createDb(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema });
}

export type Db = ReturnType<typeof createDb>;
