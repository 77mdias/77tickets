import { describe, expect, test, vi } from "vitest";

import {
  createValidateCheckinRouteAdapter,
  resolveDemoCheckerId,
} from "../../../../../src/server/api/checkin/validate-checkin.route-adapter";

describe("createValidateCheckinRouteAdapter", () => {
  test("injects checker actor server-side and forwards handler response", async () => {
    const handleValidateCheckin = vi.fn(async () => ({
      status: 200 as const,
      body: {
        data: {
          outcome: "approved" as const,
          ticketId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
          checkerId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
          validatedAt: "2026-03-29T12:00:00.000Z",
        },
      },
    }));

    const adapter = createValidateCheckinRouteAdapter({
      checkerId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
      handleValidateCheckin,
    });

    const response = await adapter(
      new Request("http://localhost/api/checkin", {
        method: "POST",
        body: JSON.stringify({
          ticketId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
          eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
        }),
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        outcome: "approved",
        ticketId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
        eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
        checkerId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
        validatedAt: "2026-03-29T12:00:00.000Z",
      },
    });

    expect(handleValidateCheckin).toHaveBeenCalledWith({
      actor: {
        role: "checker",
        userId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
      },
      body: {
        ticketId: "4b021be4-4cb2-4f5f-bcf4-f8237bcb4e7e",
        eventId: "2f180791-a8f5-4cf8-b703-0f220a44f7c8",
      },
    });
  });

  test("returns structured validation error when request body is invalid json", async () => {
    const adapter = createValidateCheckinRouteAdapter({
      checkerId: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
      handleValidateCheckin: async () => {
        throw new Error("handler should not be called");
      },
    });

    const response = await adapter(
      new Request("http://localhost/api/checkin", {
        method: "POST",
        body: "{invalid-json}",
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "validation",
        message: "Invalid request payload",
      },
    });
  });
});

describe("resolveDemoCheckerId", () => {
  test("returns fallback UUID for missing or invalid values", () => {
    const fallback = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";

    expect(resolveDemoCheckerId(undefined, fallback)).toBe(fallback);
    expect(resolveDemoCheckerId("not-a-uuid", fallback)).toBe(fallback);
  });

  test("returns normalized UUID when env value is valid", () => {
    const fallback = "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5";
    const value = "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9";

    expect(resolveDemoCheckerId(value, fallback)).toBe(value);
  });
});
