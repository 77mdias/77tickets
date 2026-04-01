import { auth } from "@/server/infrastructure/auth/auth.config";
import { authLoginRateLimiter, buildRateLimitClientKey } from "@/server/api/middleware";
import { toApiJsonResponse, withApiSecurityHeaders } from "@/server/api/security-response";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);
const checkRateLimit = authLoginRateLimiter();

export const GET = async (request: Request): Promise<Response> => {
  const response = await handlers.GET(request);
  return withApiSecurityHeaders(response);
};

export const POST = async (request: Request): Promise<Response> => {
  const clientKey = buildRateLimitClientKey(request, {
    scope: "auth:post",
  });

  const result = checkRateLimit(clientKey);
  if (!result.allowed) {
    return toApiJsonResponse(429, {
      error: {
        code: "rate_limited",
        message: "Too many authentication attempts",
        details: {
          retryAfterSeconds: result.retryAfterSeconds,
          limit: 5,
          remaining: 0,
        },
      },
    });
  }

  const response = await handlers.POST(request);
  return withApiSecurityHeaders(response);
};
