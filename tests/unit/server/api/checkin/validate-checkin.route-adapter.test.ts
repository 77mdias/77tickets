import { describe, expect, test, vi } from "vitest";
import { createUnauthenticatedError } from "../../../../../src/server/application/errors";
import { createValidateCheckinRouteAdapter } from "../../../../../src/server/api/checkin/validate-checkin.route-adapter";

const SESSION_CHECKER = { userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5", role: "checker" as const };

describe("createValidateCheckinRouteAdapter", () => {
  test("extracts session and forwards actor + body to handler", async () => {
    const getSession = vi.fn(async () => SESSION_CHECKER);
    const handleValidateCheckin = vi.fn(async () => ({
      status: 200 as const,
      body: {
        data: {
          outcome: "approved" as const,
          ticketId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
          checkerId: SESSION_CHECKER.userId,
          validatedAt: "2026-03-29T12:00:00.000Z",
        },
      },
    }));

    const adapter = createValidateCheckinRouteAdapter({ getSession, handleValidateCheckin });

    const response = await adapter(
      new Request("http://localhost/api/checkin", {
        method: "POST",
        body: JSON.stringify({
          ticketId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        outcome: "approved",
        ticketId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
        eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
        checkerId: SESSION_CHECKER.userId,
        validatedAt: "2026-03-29T12:00:00.000Z",
      },
    });

    expect(handleValidateCheckin).toHaveBeenCalledWith({
      actor: { role: "checker", userId: SESSION_CHECKER.userId },
      body: {
        ticketId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
        eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
      },
    });
  });

  test("returns 400 when request body is invalid JSON", async () => {
    const getSession = vi.fn(async () => SESSION_CHECKER);
    const adapter = createValidateCheckinRouteAdapter({
      getSession,
      handleValidateCheckin: async () => {
        throw new Error("handler should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/checkin", {
        method: "POST",
        body: "{invalid-json}",
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "validation", message: "Invalid request payload" },
    });
  });

  test("returns 401 when session is invalid or expired", async () => {
    const getSession = vi.fn(async () => {
      throw createUnauthenticatedError("Sessão inválida ou expirada");
    });
    const adapter = createValidateCheckinRouteAdapter({
      getSession,
      handleValidateCheckin: async () => {
        throw new Error("handler should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/checkin", {
        method: "POST",
        body: JSON.stringify({ ticketId: "tkt_1", eventId: "evt_1" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "unauthenticated" },
    });
  });

  test("returns 429 when rate limit is exceeded", async () => {
    const getSession = vi.fn(async () => SESSION_CHECKER);
    const handleValidateCheckin = vi.fn(async () => ({
      status: 200 as const,
      body: {
        data: {
          outcome: "approved" as const,
          ticketId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
          checkerId: SESSION_CHECKER.userId,
          validatedAt: "2026-03-29T12:00:00.000Z",
        },
      },
    }));

    const adapter = createValidateCheckinRouteAdapter({
      getSession,
      handleValidateCheckin,
      checkRateLimit: () => ({ allowed: false, retryAfterSeconds: 15 }),
      rateLimitMaxRequests: 60,
    });

    const response = await adapter(
      new Request("http://localhost/api/checkin", {
        method: "POST",
        body: JSON.stringify({
          ticketId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
        }),
        headers: { "content-type": "application/json", "x-real-ip": "198.51.100.4" },
      }),
    );

    expect(response.status).toBe(429);
    expect(handleValidateCheckin).not.toHaveBeenCalled();
    expect(response.headers.get("retry-after")).toBe("15");
    expect(response.headers.get("x-ratelimit-limit")).toBe("60");
    expect(response.headers.get("x-ratelimit-remaining")).toBe("0");
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "rate_limited",
      },
    });
  });
});
