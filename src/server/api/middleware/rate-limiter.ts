// Rate limiter compatible with Cloudflare Workers edge runtime
//
// DEMO NOTE: Uses in-memory Map — effective only per-worker-instance.
// For production, replace the store with Cloudflare KV:
//   const count = await env.RATE_LIMIT_KV.get(`rl:${key}`);
//
export interface RateLimiterConfig {
  maxRequests: number; // max requests allowed
  windowMs: number; // window in milliseconds
}

export interface RateLimiterResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimitStore {
  get(key: string): { count: number; resetAt: number } | undefined;
  set(key: string, value: { count: number; resetAt: number }): void;
}

export function createInMemoryRateLimitStore(): RateLimitStore {
  const store = new Map<string, { count: number; resetAt: number }>();
  return {
    get: (key) => store.get(key),
    set: (key, value) => store.set(key, value),
  };
}

export function createRateLimiter(config: RateLimiterConfig, store?: RateLimitStore) {
  const _store = store ?? createInMemoryRateLimitStore();

  return function checkRateLimit(clientKey: string): RateLimiterResult {
    const now = Date.now();
    const existing = _store.get(clientKey);

    if (!existing || now >= existing.resetAt) {
      _store.set(clientKey, { count: 1, resetAt: now + config.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (existing.count >= config.maxRequests) {
      const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
      return { allowed: false, retryAfterSeconds };
    }

    _store.set(clientKey, { count: existing.count + 1, resetAt: existing.resetAt });
    return { allowed: true, retryAfterSeconds: 0 };
  };
}

// Pre-configured limiters for critical endpoints
export const createOrderRateLimiter = () => createRateLimiter({ maxRequests: 10, windowMs: 60_000 });
export const authLoginRateLimiter = () => createRateLimiter({ maxRequests: 5, windowMs: 60_000 });
export const checkinRateLimiter = () => createRateLimiter({ maxRequests: 60, windowMs: 60_000 });
// Organizer/admin mutation endpoints (create/update events, lots, coupons)
export const createMutationRateLimiter = () => createRateLimiter({ maxRequests: 30, windowMs: 60_000 });
