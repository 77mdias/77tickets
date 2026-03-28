import { createAuthorizationError } from "../errors";

import type { SecurityActor } from "./security.types";

export interface CreateOrderAccessInput {
  actor: SecurityActor;
  targetCustomerId: string;
}

export const hasCreateOrderAccess = ({ actor, targetCustomerId }: CreateOrderAccessInput): boolean => {
  if (actor.role === "admin") {
    return true;
  }

  if (actor.role === "customer") {
    return actor.userId === targetCustomerId;
  }

  return false;
};

export const assertCreateOrderAccess = (input: CreateOrderAccessInput): void => {
  if (!hasCreateOrderAccess(input)) {
    throw createAuthorizationError("Forbidden");
  }
};
