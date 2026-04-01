import { describe, expect, test } from "vitest";

import {
  buildRateLimitClientKey,
  enforceRateLimit,
} from "@/server/api/middleware/rate-limit-request";

describe("rate-limit-request", () => {
  test("buildRateLimitClientKey includes scope, user id, and ip", () => {
    const request = new Request("http://localhost/api/orders", {
      headers: {
        "x-forwarded-for": "203.0.113.10, 70.41.3.18",
      },
    });

    const key = buildRateLimitClientKey(request, {
      scope: "orders:create",
      userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
    });

    expect(key).toBe(
      "orders:create:user:57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5:ip:203.0.113.10",
    );
  });

  test("falls back to anonymous + unknown-ip when headers are absent", () => {
    const request = new Request("http://localhost/api/orders");

    const key = buildRateLimitClientKey(request, {
      scope: "orders:create",
    });

    expect(key).toBe("orders:create:user:anonymous:ip:unknown-ip");
  });

  test("enforceRateLimit throws rate_limited app error when blocked", () => {
    const request = new Request("http://localhost/api/orders", {
      headers: {
        "cf-connecting-ip": "198.51.100.8",
      },
    });

    try {
      enforceRateLimit({
        request,
        scope: "orders:create",
        userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
        maxRequests: 10,
        checkRateLimit: () => ({ allowed: false, retryAfterSeconds: 27 }),
      });
      throw new Error("expected enforceRateLimit to throw");
    } catch (error) {
      expect(error).toMatchObject({
        code: "rate_limited",
        details: {
          retryAfterSeconds: 27,
          limit: 10,
          remaining: 0,
        },
      });
    }
  });
});
