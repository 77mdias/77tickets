import {
  isPersistenceError,
  type PersistenceErrorKind,
} from "../../repositories";
import { AppError, createConflictError, createInternalError } from "./app-error";

const CONFLICT_PERSISTENCE_ERROR_KINDS: PersistenceErrorKind[] = [
  "unique-constraint",
  "foreign-key-constraint",
  "check-constraint",
];

export const mapUnknownErrorToAppError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (isPersistenceError(error)) {
    if (CONFLICT_PERSISTENCE_ERROR_KINDS.includes(error.kind)) {
      return createConflictError("Persistence conflict", {
        details: {
          kind: error.kind,
          ...(error.constraint ? { constraint: error.constraint } : {}),
        },
      });
    }

    return createInternalError("Persistence failure", {
      cause: error,
      details: {
        kind: error.kind,
        ...(error.constraint ? { constraint: error.constraint } : {}),
      },
    });
  }

  return createInternalError("Internal server error", {
    cause: error,
  });
};
