import { createAuthorizationError } from "../errors";
import type { SecurityActor } from "./security.types";

export interface CheckinAccessInput {
  actor: SecurityActor;
  eventOrganizerId: string | null;
}

export const hasCheckinAccess = ({
  actor,
  eventOrganizerId,
}: CheckinAccessInput): boolean => {
  if (actor.role === "admin" || actor.role === "checker") {
    return true;
  }

  if (actor.role === "organizer") {
    return eventOrganizerId !== null && actor.userId === eventOrganizerId;
  }

  return false;
};

export const assertCheckinAccess = (input: CheckinAccessInput): void => {
  if (!hasCheckinAccess(input)) {
    throw createAuthorizationError("Forbidden", {
      details: { reason: "forbidden_checkin_access" },
    });
  }
};
