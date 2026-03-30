import { describe, expect, test } from "vitest";

import { AppError } from "../../../../src/server/application/errors/app-error";
import { mapAppErrorToResponse } from "../../../../src/server/api/error-mapper";

describe("mapAppErrorToResponse", () => {
  test("maps unauthenticated error to 401", () => {
    const error = new AppError("unauthenticated", "Sessão inválida ou expirada");
    const result = mapAppErrorToResponse(error);
    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe("unauthenticated");
  });

  test("maps authorization error to 403", () => {
    const error = new AppError("authorization", "Forbidden");
    const result = mapAppErrorToResponse(error);
    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe("authorization");
  });

  test("maps validation error to 400", () => {
    const error = new AppError("validation", "Invalid input");
    const result = mapAppErrorToResponse(error);
    expect(result.status).toBe(400);
  });

  test("maps not-found error to 404", () => {
    const error = new AppError("not-found", "Resource not found");
    const result = mapAppErrorToResponse(error);
    expect(result.status).toBe(404);
  });

  test("maps conflict error to 409", () => {
    const error = new AppError("conflict", "Conflict");
    const result = mapAppErrorToResponse(error);
    expect(result.status).toBe(409);
  });

  test("maps internal error to 500", () => {
    const error = new AppError("internal", "Internal server error");
    const result = mapAppErrorToResponse(error);
    expect(result.status).toBe(500);
  });

  test("maps unknown errors to 500", () => {
    const result = mapAppErrorToResponse(new Error("unexpected"));
    expect(result.status).toBe(500);
  });
});
