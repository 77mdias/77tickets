import { describe, expect, test } from "vitest";

import { AppError } from "@/src/server/application/errors";
import { assertEventManagementAccess } from "@/src/server/application/security";

const ORGANIZER_A = "00000000-0000-0000-0000-000000000001";
const ORGANIZER_B = "00000000-0000-0000-0000-000000000002";

describe("assertEventManagementAccess", () => {
  test("throws authorization error when organizer does not own the event", () => {
    expect(() =>
      assertEventManagementAccess({
        actor: {
          role: "organizer",
          userId: ORGANIZER_A,
        },
        eventOrganizerId: ORGANIZER_B,
      }),
    ).toThrowError(AppError);

    try {
      assertEventManagementAccess({
        actor: {
          role: "organizer",
          userId: ORGANIZER_A,
        },
        eventOrganizerId: ORGANIZER_B,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);

      if (error instanceof AppError) {
        expect(error.code).toBe("authorization");
        expect(error.message).toBe("Forbidden");
      }
    }
  });

  test("allows admin global access", () => {
    expect(() =>
      assertEventManagementAccess({
        actor: {
          role: "admin",
          userId: "00000000-0000-0000-0000-000000000099",
        },
        eventOrganizerId: ORGANIZER_B,
      }),
    ).not.toThrow();
  });
});
