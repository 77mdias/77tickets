import type { AppErrorCode, AppErrorPayload } from "./app-error.types";

export interface AppErrorOptions {
  details?: Record<string, unknown>;
  traceId?: string;
  cause?: unknown;
}

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly traceId?: string;

  constructor(code: AppErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);

    this.name = "AppError";
    this.code = code;
    this.details = options.details;
    this.traceId = options.traceId;

    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const isAppError = (value: unknown): value is AppError => value instanceof AppError;

export const serializeAppError = (error: AppError): AppErrorPayload => ({
  code: error.code,
  message: error.message,
  ...(error.details ? { details: error.details } : {}),
  ...(error.traceId ? { traceId: error.traceId } : {}),
});

export const createValidationError = (
  message: string,
  options: Omit<AppErrorOptions, "cause"> = {},
): AppError => new AppError("validation", message, options);

export const createNotFoundError = (
  message: string,
  options: Omit<AppErrorOptions, "cause"> = {},
): AppError => new AppError("not-found", message, options);

export const createAuthorizationError = (
  message: string,
  options: Omit<AppErrorOptions, "cause"> = {},
): AppError => new AppError("authorization", message, options);

export const createConflictError = (
  message: string,
  options: Omit<AppErrorOptions, "cause"> = {},
): AppError => new AppError("conflict", message, options);

export const createInternalError = (
  message: string,
  options: AppErrorOptions = {},
): AppError => new AppError("internal", message, options);
