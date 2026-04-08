import { mapAppErrorToResponse } from "../error-mapper";
import type { RateLimiterResult } from "./rate-limiter";
import { buildRateLimitClientKey } from "./rate-limit-request";
import { createRateLimitedError } from "@/server/application/errors";

/**
 * Higher-order function that wraps a route handler with rate limiting.
 * On limit exceeded, returns 429 JSON without invoking the inner handler.
 *
 * Usage:
 *   const handler = withRateLimit("create-event", 30, checkRateLimit)(innerHandler);
 */
export const withRateLimit =
  (
    scope: string,
    maxRequests: number,
    checkRateLimit: (clientKey: string) => RateLimiterResult,
  ) =>
  <THandler extends (request: Request, ...args: unknown[]) => Promise<Response>>(
    handler: THandler,
  ): THandler =>
    (async (request: Request, ...args: unknown[]): Promise<Response> => {
      try {
        const clientKey = buildRateLimitClientKey(request, { scope });
        const result = checkRateLimit(clientKey);

        if (!result.allowed) {
          throw createRateLimitedError("Too many requests", {
            details: {
              retryAfterSeconds: result.retryAfterSeconds,
              limit: maxRequests,
              remaining: 0,
            },
          });
        }
      } catch (error) {
        const mapped = mapAppErrorToResponse(error);
        return Response.json(mapped.body, { status: mapped.status });
      }

      return handler(request, ...args);
    }) as THandler;
