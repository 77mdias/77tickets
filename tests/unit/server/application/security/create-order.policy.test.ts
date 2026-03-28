import { expect, test } from "vitest";

import {
  assertCreateOrderAccess,
  hasCreateOrderAccess,
} from "../../../../../src/server/application/security/create-order.policy";
import type { SecurityActor } from "../../../../../src/server/application/security/security.types";

const CUSTOMER_A = "00000000-0000-0000-0000-000000000001";
const CUSTOMER_B = "00000000-0000-0000-0000-000000000002";

const buildActor = (role: SecurityActor["role"], userId: string): SecurityActor => ({
  role,
  userId,
});

test("hasCreateOrderAccess allows customer for own order only", () => {
  expect(
    hasCreateOrderAccess({
      actor: buildActor("customer", CUSTOMER_A),
      targetCustomerId: CUSTOMER_A,
    }),
  ).toBe(true);

  expect(
    hasCreateOrderAccess({
      actor: buildActor("customer", CUSTOMER_A),
      targetCustomerId: CUSTOMER_B,
    }),
  ).toBe(false);
});

test("hasCreateOrderAccess allows admin for any customer", () => {
  expect(
    hasCreateOrderAccess({
      actor: buildActor("admin", "00000000-0000-0000-0000-000000000099"),
      targetCustomerId: CUSTOMER_B,
    }),
  ).toBe(true);
});

test("hasCreateOrderAccess denies organizer and checker", () => {
  expect(
    hasCreateOrderAccess({
      actor: buildActor("organizer", "00000000-0000-0000-0000-000000000010"),
      targetCustomerId: CUSTOMER_A,
    }),
  ).toBe(false);

  expect(
    hasCreateOrderAccess({
      actor: buildActor("checker", "00000000-0000-0000-0000-000000000011"),
      targetCustomerId: CUSTOMER_A,
    }),
  ).toBe(false);
});

test("assertCreateOrderAccess throws authorization error on forbidden attempt", () => {
  expect(() =>
    assertCreateOrderAccess({
      actor: buildActor("customer", CUSTOMER_A),
      targetCustomerId: CUSTOMER_B,
    }),
  ).toThrowError("Forbidden");
});
