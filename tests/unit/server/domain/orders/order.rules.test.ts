import { describe, expect, test } from "vitest";

import {
  canTransitionOrder,
  validateOrderTransition,
} from "@/server/domain/orders/order.rules";

// ─── canTransitionOrder ───────────────────────────────────────────────────────

describe("canTransitionOrder", () => {
  // Valid transitions
  test("allows pending → paid", () => {
    expect(canTransitionOrder("pending", "paid")).toBe(true);
  });

  test("allows pending → expired", () => {
    expect(canTransitionOrder("pending", "expired")).toBe(true);
  });

  test("allows pending → cancelled", () => {
    expect(canTransitionOrder("pending", "cancelled")).toBe(true);
  });

  test("allows paid → cancelled", () => {
    expect(canTransitionOrder("paid", "cancelled")).toBe(true);
  });

  // Invalid transitions from paid
  test("rejects paid → pending", () => {
    expect(canTransitionOrder("paid", "pending")).toBe(false);
  });

  test("rejects paid → expired", () => {
    expect(canTransitionOrder("paid", "expired")).toBe(false);
  });

  test("rejects paid → paid (same status)", () => {
    expect(canTransitionOrder("paid", "paid")).toBe(false);
  });

  // Terminal: expired cannot transition to anything
  test("rejects expired → paid", () => {
    expect(canTransitionOrder("expired", "paid")).toBe(false);
  });

  test("rejects expired → pending", () => {
    expect(canTransitionOrder("expired", "pending")).toBe(false);
  });

  test("rejects expired → cancelled", () => {
    expect(canTransitionOrder("expired", "cancelled")).toBe(false);
  });

  // Terminal: cancelled cannot transition to anything
  test("rejects cancelled → pending", () => {
    expect(canTransitionOrder("cancelled", "pending")).toBe(false);
  });

  test("rejects cancelled → paid", () => {
    expect(canTransitionOrder("cancelled", "paid")).toBe(false);
  });

  test("rejects cancelled → expired", () => {
    expect(canTransitionOrder("cancelled", "expired")).toBe(false);
  });
});

// ─── validateOrderTransition ──────────────────────────────────────────────────

describe("validateOrderTransition", () => {
  test("returns ok:true for valid transition pending → paid", () => {
    expect(validateOrderTransition("pending", "paid")).toEqual({ ok: true });
  });

  test("returns ok:true for valid transition paid → cancelled", () => {
    expect(validateOrderTransition("paid", "cancelled")).toEqual({ ok: true });
  });

  test("returns order_is_terminal when transitioning from expired", () => {
    expect(validateOrderTransition("expired", "paid")).toEqual({
      ok: false,
      reason: "order_is_terminal",
    });
  });

  test("returns order_is_terminal when transitioning from cancelled", () => {
    expect(validateOrderTransition("cancelled", "pending")).toEqual({
      ok: false,
      reason: "order_is_terminal",
    });
  });

  test("returns invalid_transition for paid → pending", () => {
    expect(validateOrderTransition("paid", "pending")).toEqual({
      ok: false,
      reason: "invalid_transition",
    });
  });

  test("returns invalid_transition for paid → expired", () => {
    expect(validateOrderTransition("paid", "expired")).toEqual({
      ok: false,
      reason: "invalid_transition",
    });
  });

  test("returns invalid_transition for same status paid → paid", () => {
    expect(validateOrderTransition("paid", "paid")).toEqual({
      ok: false,
      reason: "invalid_transition",
    });
  });
});
