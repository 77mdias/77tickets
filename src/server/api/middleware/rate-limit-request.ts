import { createRateLimitedError } from "@/server/application/errors";

import type { RateLimiterResult } from "./rate-limiter";

export interface EnforceRateLimitInput {
  request: Request;
  scope: string;
  userId?: string;
  maxRequests: number;
  checkRateLimit: (clientKey: string) => RateLimiterResult;
}

const readClientIp = (request: Request): string => {
  const cfConnectingIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  const xForwardedFor = request.headers.get("x-forwarded-for")?.trim();
  if (xForwardedFor) {
    const [firstIp] = xForwardedFor.split(",");
    const normalized = firstIp?.trim();
    if (normalized) {
      return normalized;
    }
  }

  const xRealIp = request.headers.get("x-real-ip")?.trim();
  if (xRealIp) {
    return xRealIp;
  }

  return "unknown-ip";
};

export const buildRateLimitClientKey = (
  request: Request,
  context: { scope: string; userId?: string },
): string => {
  const actorKey = context.userId?.trim() || "anonymous";
  const ip = readClientIp(request);

  return `${context.scope}:user:${actorKey}:ip:${ip}`;
};

export const enforceRateLimit = ({
  request,
  scope,
  userId,
  maxRequests,
  checkRateLimit,
}: EnforceRateLimitInput): void => {
  const clientKey = buildRateLimitClientKey(request, { scope, userId });
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
};

