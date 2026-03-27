export type PersistenceErrorKind =
  | "unique-constraint"
  | "foreign-key-constraint"
  | "check-constraint"
  | "unknown";

export interface PersistenceErrorOptions {
  cause?: unknown;
  constraint?: string;
}

export class PersistenceError extends Error {
  public readonly kind: PersistenceErrorKind;
  public readonly constraint?: string;

  constructor(
    kind: PersistenceErrorKind,
    message: string,
    options: PersistenceErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "PersistenceError";
    this.kind = kind;
    this.constraint = options.constraint;
    Object.setPrototypeOf(this, PersistenceError.prototype);
  }
}

export const isPersistenceError = (
  value: unknown,
): value is PersistenceError => value instanceof PersistenceError;
