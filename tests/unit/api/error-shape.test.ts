import { describe, expect, test } from "vitest";

import {
  createAuthorizationError,
  createConflictError,
  createInternalError,
  createNotFoundError,
  createRateLimitedError,
  createUnauthenticatedError,
  createValidationError,
} from "@/server/application/errors";
import { mapAppErrorToResponse } from "@/server/api/error-mapper";

describe("error shape standardization", () => {
  // ── Status codes ────────────────────────────────────────────────────────────

  test("validation error maps to 400 with standard shape", () => {
    const response = mapAppErrorToResponse(createValidationError("bad input"));
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "validation",
      message: expect.any(String),
    });
  });

  test("unauthenticated error maps to 401 with standard shape", () => {
    const response = mapAppErrorToResponse(
      createUnauthenticatedError("session expired"),
    );
    expect(response.status).toBe(401);
    expect(response.body.error).toMatchObject({
      code: "unauthenticated",
      message: expect.any(String),
    });
  });

  test("authorization error maps to 403 with standard shape", () => {
    const response = mapAppErrorToResponse(
      createAuthorizationError("Forbidden"),
    );
    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({
      code: "authorization",
      message: expect.any(String),
    });
  });

  test("not-found error maps to 404 with standard shape", () => {
    const response = mapAppErrorToResponse(
      createNotFoundError("resource not found"),
    );
    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({
      code: "not-found",
      message: expect.any(String),
    });
  });

  test("conflict error maps to 409 with standard shape", () => {
    const response = mapAppErrorToResponse(
      createConflictError("duplicate entry"),
    );
    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({
      code: "conflict",
      message: expect.any(String),
    });
  });

  test("internal error maps to 500 with standard shape", () => {
    const response = mapAppErrorToResponse(
      createInternalError("something went wrong"),
    );
    expect(response.status).toBe(500);
    expect(response.body.error).toMatchObject({
      code: "internal",
      message: expect.any(String),
    });
  });

  test("rate_limited error maps to 429 with standard shape", () => {
    const response = mapAppErrorToResponse(
      createRateLimitedError("too many requests", {
        details: { retryAfterSeconds: 30, limit: 10, remaining: 0 },
      }),
    );
    expect(response.status).toBe(429);
    expect(response.body.error).toMatchObject({
      code: "rate_limited",
      message: expect.any(String),
      details: {
        retryAfterSeconds: 30,
        limit: 10,
        remaining: 0,
      },
    });
  });

  // ── Unknown / raw errors ────────────────────────────────────────────────────

  test("unknown errors map to 500 internal shape", () => {
    const response = mapAppErrorToResponse(new Error("surprise"));
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("internal");
    expect(response.body.error.message).toBeDefined();
  });

  test("non-Error thrown values map to 500 internal shape", () => {
    const response = mapAppErrorToResponse("oops");
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("internal");
  });

  // ── Body structure ──────────────────────────────────────────────────────────

  test("error body always contains code and message fields", () => {
    const allErrors = [
      createValidationError("v"),
      createUnauthenticatedError("u"),
      createAuthorizationError("a"),
      createNotFoundError("n"),
      createConflictError("c"),
      createInternalError("i"),
    ];

    for (const err of allErrors) {
      const { body } = mapAppErrorToResponse(err);
      expect(typeof body.error.code).toBe("string");
      expect(typeof body.error.message).toBe("string");
    }
  });

  test("error body is nested under body.error, not body directly", () => {
    const response = mapAppErrorToResponse(createNotFoundError("missing"));
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toHaveProperty("code");
    expect(response.body.error).toHaveProperty("message");
  });

  test("details are preserved when provided", () => {
    const response = mapAppErrorToResponse(
      createValidationError("invalid field", { details: { field: "email" } }),
    );
    expect(response.body.error.details).toEqual({ field: "email" });
  });

  test("details are absent when not provided", () => {
    const response = mapAppErrorToResponse(createNotFoundError("missing"));
    expect(response.body.error).not.toHaveProperty("details");
  });

  // ── Information leakage ─────────────────────────────────────────────────────

  test("error body never exposes raw stack traces or DB errors", () => {
    const dbError = Object.assign(
      new Error("syntax error near SELECT * FROM users"),
      { code: "42601" },
    );
    const response = mapAppErrorToResponse(dbError);
    expect(response.body.error.message).not.toContain("SELECT");
    expect(response.body.error).not.toHaveProperty("stack");
  });

  test("error body does not expose internal Error stack property", () => {
    const internalErr = createInternalError("internal");
    const response = mapAppErrorToResponse(internalErr);
    expect(response.body.error).not.toHaveProperty("stack");
  });

  test("error body does not expose cause chain", () => {
    const cause = new Error("original DB error with sensitive data");
    const response = mapAppErrorToResponse(
      createInternalError("safe message", { cause }),
    );
    expect(response.body.error).not.toHaveProperty("cause");
    expect(JSON.stringify(response.body.error)).not.toContain(
      "original DB error",
    );
  });
});
