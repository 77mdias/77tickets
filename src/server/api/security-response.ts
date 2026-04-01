import type { AppErrorPayload } from "@/server/application/errors";

const API_SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
} as const;

const toHeaderValue = (value: unknown): string | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.max(0, Math.trunc(value)));
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
};

const appendRateLimitHeaders = (headers: Headers, error: AppErrorPayload): void => {
  if (error.code !== "rate_limited" || !error.details) {
    return;
  }

  const retryAfter = toHeaderValue(error.details.retryAfterSeconds);
  if (retryAfter) {
    headers.set("Retry-After", retryAfter);
  }

  const limit = toHeaderValue(error.details.limit);
  if (limit) {
    headers.set("X-RateLimit-Limit", limit);
  }

  const remaining = toHeaderValue(error.details.remaining);
  if (remaining) {
    headers.set("X-RateLimit-Remaining", remaining);
  }

  const reset = toHeaderValue(error.details.resetAtUnix);
  if (reset) {
    headers.set("X-RateLimit-Reset", reset);
  }
};

const appendApiSecurityHeaders = (headers: Headers): void => {
  for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) {
    headers.set(name, value);
  }
};

export const toApiJsonResponse = (
  status: number,
  payload: { error: AppErrorPayload } | { data: unknown },
): Response => {
  const headers = new Headers();
  appendApiSecurityHeaders(headers);

  if ("error" in payload) {
    appendRateLimitHeaders(headers, payload.error);
  }

  return Response.json(payload, { status, headers });
};

export const withApiSecurityHeaders = (response: Response): Response => {
  const headers = new Headers(response.headers);
  appendApiSecurityHeaders(headers);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

