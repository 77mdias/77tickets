import {
  mapUnknownErrorToAppError,
  serializeAppError,
  type AppErrorCode,
  type AppErrorPayload,
} from "../application/errors";

const HTTP_STATUS_BY_ERROR_CODE: Record<AppErrorCode, number> = {
  validation: 400,
  "not-found": 404,
  conflict: 409,
  internal: 500,
};

export interface ErrorResponse {
  status: number;
  body: {
    error: AppErrorPayload;
  };
}

export const mapAppErrorToResponse = (error: unknown): ErrorResponse => {
  const appError = mapUnknownErrorToAppError(error);

  return {
    status: HTTP_STATUS_BY_ERROR_CODE[appError.code],
    body: {
      error: serializeAppError(appError),
    },
  };
};
