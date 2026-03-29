import { expect, test } from "vitest";

import {
  assertCheckinAccess,
  hasCheckinAccess,
} from "../../../../../src/server/application/security/checkin-access.policy";
import type { SecurityActor } from "../../../../../src/server/application/security/security.types";

const ORGANIZER_A = "00000000-0000-0000-0000-000000000001";
const ORGANIZER_B = "00000000-0000-0000-0000-000000000002";

const buildActor = (role: SecurityActor["role"], userId: string): SecurityActor => ({
  role,
  userId,
});

test("hasCheckinAccess allows admin and checker globally", () => {
  expect(
    hasCheckinAccess({
      actor: buildActor("admin", "00000000-0000-0000-0000-000000000099"),
      eventOrganizerId: ORGANIZER_A,
    }),
  ).toBe(true);

  expect(
    hasCheckinAccess({
      actor: buildActor("checker", "00000000-0000-0000-0000-000000000011"),
      eventOrganizerId: ORGANIZER_A,
    }),
  ).toBe(true);
});

test("hasCheckinAccess allows organizer only for own event", () => {
  expect(
    hasCheckinAccess({
      actor: buildActor("organizer", ORGANIZER_A),
      eventOrganizerId: ORGANIZER_A,
    }),
  ).toBe(true);

  expect(
    hasCheckinAccess({
      actor: buildActor("organizer", ORGANIZER_A),
      eventOrganizerId: ORGANIZER_B,
    }),
  ).toBe(false);
});

test("hasCheckinAccess denies customer and missing scope", () => {
  expect(
    hasCheckinAccess({
      actor: buildActor("customer", "00000000-0000-0000-0000-000000000003"),
      eventOrganizerId: ORGANIZER_A,
    }),
  ).toBe(false);

  expect(
    hasCheckinAccess({
      actor: buildActor("organizer", ORGANIZER_A),
      eventOrganizerId: null,
    }),
  ).toBe(false);
});

test("assertCheckinAccess throws authorization error when forbidden", () => {
  expect(() =>
    assertCheckinAccess({
      actor: buildActor("customer", "00000000-0000-0000-0000-000000000003"),
      eventOrganizerId: ORGANIZER_A,
    }),
  ).toThrowError("Forbidden");
});
