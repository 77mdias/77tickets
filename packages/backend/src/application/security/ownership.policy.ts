import { createAuthorizationError } from "../errors";
import type { EventManagementAccessInput } from "./security.types";

export const hasEventManagementAccess = ({
  actor,
  eventOrganizerId,
}: EventManagementAccessInput): boolean => {
  if (actor.role === "admin") {
    return true;
  }

  if (actor.role === "organizer") {
    return actor.userId === eventOrganizerId;
  }

  return false;
};

export const assertEventManagementAccess = (
  input: EventManagementAccessInput,
): void => {
  if (!hasEventManagementAccess(input)) {
    throw createAuthorizationError("Forbidden");
  }
};
