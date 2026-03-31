import { describe, expect, test } from "vitest";
import {
  createRateLimiter,
  createInMemoryRateLimitStore,
} from "@/server/api/middleware/rate-limiter";

describe("rate limiter", () => {
  test("allows requests within the limit", () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60_000 });

    expect(limiter("client-a")).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(limiter("client-a")).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(limiter("client-a")).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  test("blocks requests exceeding the limit", () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60_000 });

    limiter("client-b");
    limiter("client-b");

    const result = limiter("client-b");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  test("resets after the window expires", () => {
    const store = createInMemoryRateLimitStore();
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 1 }, store);

    // Exhaust the limit
    limiter("client-c");
    const blocked = limiter("client-c");
    expect(blocked.allowed).toBe(false);

    // Manually expire the window by back-dating the stored entry
    const expired = store.get("client-c")!;
    store.set("client-c", { count: expired.count, resetAt: Date.now() - 1 });

    // Next request should be treated as a fresh window
    const result = limiter("client-c");
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSeconds).toBe(0);
  });

  test("returns correct Retry-After seconds", () => {
    const store = createInMemoryRateLimitStore();
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 30_000 }, store);

    limiter("client-d");

    // Force a known reset time 10 seconds from now
    const resetAt = Date.now() + 10_000;
    store.set("client-d", { count: 1, resetAt });

    const result = limiter("client-d");
    expect(result.allowed).toBe(false);
    // Math.ceil((resetAt - now) / 1000) should be ~10
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(9);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(11);
  });

  test("different client keys are tracked independently", () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });

    // Exhaust limit for client-e
    limiter("client-e");
    const blockedE = limiter("client-e");
    expect(blockedE.allowed).toBe(false);

    // client-f should have its own independent counter
    const resultF = limiter("client-f");
    expect(resultF.allowed).toBe(true);
    expect(resultF.retryAfterSeconds).toBe(0);
  });
});
