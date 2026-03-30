import { describe, expect, test, vi } from "vitest";

import { createGetSession } from "../../../../../src/server/api/auth/get-session";

describe("createGetSession", () => {
  test("returns SessionContext when session is valid", async () => {
    const resolveSession = vi.fn(async () => ({
      user: {
        id: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
        role: "customer",
      },
    }));
    const getSession = createGetSession(resolveSession);

    const request = new Request("http://localhost/api/orders", {
      headers: { cookie: "session=abc123" },
    });

    const result = await getSession(request);

    expect(result.userId).toBe("57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5");
    expect(result.role).toBe("customer");
    expect(resolveSession).toHaveBeenCalledWith(request);
  });

  test("returns organizer role from session", async () => {
    const resolveSession = vi.fn(async () => ({
      user: {
        id: "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9",
        role: "organizer",
      },
    }));
    const getSession = createGetSession(resolveSession);

    const request = new Request("http://localhost/api/events/publish");
    const result = await getSession(request);

    expect(result.role).toBe("organizer");
    expect(result.userId).toBe("5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9");
  });

  test("throws unauthenticated AppError when session is null", async () => {
    const resolveSession = vi.fn(async () => null);
    const getSession = createGetSession(resolveSession);

    const request = new Request("http://localhost/api/orders");

    await expect(getSession(request)).rejects.toMatchObject({
      code: "unauthenticated",
      message: "Sessão inválida ou expirada",
    });
  });

  test("propagates errors from resolveSession", async () => {
    const resolveSession = vi.fn(async () => {
      throw new Error("DB connection failed");
    });
    const getSession = createGetSession(resolveSession);

    const request = new Request("http://localhost/api/orders");

    await expect(getSession(request)).rejects.toThrow("DB connection failed");
  });

  test("falls back to customer when role is missing or invalid", async () => {
    const resolveSession = vi
      .fn()
      .mockResolvedValueOnce({
        user: {
          id: "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9",
        },
      })
      .mockResolvedValueOnce({
        user: {
          id: "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9",
          role: "super-admin",
        },
      });

    const getSession = createGetSession(resolveSession);
    const request = new Request("http://localhost/api/orders");

    await expect(getSession(request)).resolves.toMatchObject({ role: "customer" });
    await expect(getSession(request)).resolves.toMatchObject({ role: "customer" });
  });
});
