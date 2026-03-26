export type AppErrorCode = "validation" | "not-found" | "conflict" | "internal";

export interface AppErrorPayload {
  code: AppErrorCode;
  message: string;
  details?: Record<string, unknown>;
  traceId?: string;
}
