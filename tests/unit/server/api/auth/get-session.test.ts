import { describe, expect, test, vi } from "vitest";

vi.mock("../../../../../src/server/infrastructure/auth/auth.config", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// eslint-disable-next-line import/first
import { auth } from "../../../../../src/server/infrastructure/auth/auth.config";
// eslint-disable-next-line import/first
import { getSession } from "../../../../../src/server/api/auth/get-session";

describe("getSession", () => {
  test("returns SessionContext when session is valid", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: {
        id: "57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5",
        role: "customer",
      } as never,
      session: {} as never,
    });

    const request = new Request("http://localhost/api/orders", {
      headers: { cookie: "session=abc123" },
    });

    const result = await getSession(request);

    expect(result.userId).toBe("57d1cfdb-a4dd-4af8-90be-6ce315f8f6f5");
    expect(result.role).toBe("customer");
    expect(auth.api.getSession).toHaveBeenCalledWith({
      headers: request.headers,
    });
  });

  test("returns organizer role from session", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: {
        id: "5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9",
        role: "organizer",
      } as never,
      session: {} as never,
    });

    const request = new Request("http://localhost/api/events/publish");
    const result = await getSession(request);

    expect(result.role).toBe("organizer");
    expect(result.userId).toBe("5c95fe31-36f0-4a53-bbf3-5ca3cfe36df9");
  });

  test("throws unauthenticated AppError when session is null", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/orders");

    await expect(getSession(request)).rejects.toMatchObject({
      code: "unauthenticated",
      message: "Sessão inválida ou expirada",
    });
  });

  test("propagates errors from auth.api.getSession", async () => {
    vi.mocked(auth.api.getSession).mockRejectedValueOnce(new Error("DB connection failed"));

    const request = new Request("http://localhost/api/orders");

    await expect(getSession(request)).rejects.toThrow("DB connection failed");
  });
});
