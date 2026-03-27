import {
  PersistenceError,
  type PersistenceErrorKind,
} from "../persistence-error";

const KIND_BY_POSTGRES_CODE: Record<string, PersistenceErrorKind> = {
  "23503": "foreign-key-constraint",
  "23505": "unique-constraint",
  "23514": "check-constraint",
};

export function mapPersistenceError(
  error: unknown,
  operation: string,
): PersistenceError {
  const cause = extractDatabaseCause(error);
  const postgresCode = readString(cause, "code") ?? readString(error, "code");
  const constraint =
    readString(cause, "constraint") ?? readString(error, "constraint");

  return new PersistenceError(
    postgresCode ? (KIND_BY_POSTGRES_CODE[postgresCode] ?? "unknown") : "unknown",
    `Persistence operation failed: ${operation}.`,
    { cause: error, constraint },
  );
}

function extractDatabaseCause(error: unknown): unknown {
  return isRecord(error) && "cause" in error ? error.cause : error;
}

function readString(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const field = value[key];
  return typeof field === "string" ? field : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
