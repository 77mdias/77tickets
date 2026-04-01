export type AppErrorCode =
  | "validation"
  | "unauthenticated"
  | "authorization"
  | "not-found"
  | "conflict"
  | "rate_limited"
  | "internal";

export interface AppErrorPayload {
  code: AppErrorCode;
  message: string;
  details?: Record<string, unknown>;
  traceId?: string;
}
