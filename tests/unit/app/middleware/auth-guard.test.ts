import { afterEach, describe, expect, test, vi } from "vitest";

import { middleware } from "@/middleware";

const makeRequest = (pathname: string, cookieHeader = ""): Request => {
  const url = `http://localhost:3000${pathname}`;
  return new Request(url, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
};

const mockFetch = (role: string | null) => {
  if (role === null) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(null), { status: 200 })),
    );
  } else {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ user: { role } }), { status: 200 }),
      ),
    );
  }
};

const mockFetchError = () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
};

describe("middleware — auth guards", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // /admin
  describe("/admin", () => {
    test("permite acesso para role 'admin'", async () => {
      mockFetch("admin");
      const res = await middleware(makeRequest("/admin") as never);
      expect(res.status).not.toBe(307);
      expect(res.headers.get("location")).toBeNull();
    });

    test("redireciona 'organizer' para login", async () => {
      mockFetch("organizer");
      const res = await middleware(makeRequest("/admin") as never);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
      expect(res.headers.get("location")).toContain("next=%2Fadmin");
    });

    test("redireciona 'checker' para login", async () => {
      mockFetch("checker");
      const res = await middleware(makeRequest("/admin") as never);
      expect(res.status).toBe(307);
    });

    test("redireciona 'customer' para login", async () => {
      mockFetch("customer");
      const res = await middleware(makeRequest("/admin") as never);
      expect(res.status).toBe(307);
    });

    test("redireciona sem sessão para login", async () => {
      mockFetch(null);
      const res = await middleware(makeRequest("/admin") as never);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });

    test("redireciona em caso de erro de rede para login", async () => {
      mockFetchError();
      const res = await middleware(makeRequest("/admin") as never);
      expect(res.status).toBe(307);
    });

    test("protege sub-rotas de /admin", async () => {
      mockFetch("customer");
      const res = await middleware(makeRequest("/admin/eventos") as never);
      expect(res.status).toBe(307);
    });
  });

  // /checkin
  describe("/checkin", () => {
    test.each(["admin", "organizer", "checker"])(
      "permite acesso para role '%s'",
      async (role) => {
        mockFetch(role);
        const res = await middleware(makeRequest("/checkin") as never);
        expect(res.status).not.toBe(307);
      },
    );

    test("redireciona 'customer' para login", async () => {
      mockFetch("customer");
      const res = await middleware(makeRequest("/checkin") as never);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("next=%2Fcheckin");
    });

    test("redireciona sem sessão para login", async () => {
      mockFetch(null);
      const res = await middleware(makeRequest("/checkin") as never);
      expect(res.status).toBe(307);
    });
  });

  // /meus-ingressos
  describe("/meus-ingressos", () => {
    test.each(["customer", "admin", "organizer", "checker"])(
      "permite qualquer role autenticada '%s'",
      async (role) => {
        mockFetch(role);
        const res = await middleware(makeRequest("/meus-ingressos") as never);
        expect(res.status).not.toBe(307);
      },
    );

    test("redireciona sem sessão para login", async () => {
      mockFetch(null);
      const res = await middleware(makeRequest("/meus-ingressos") as never);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("next=%2Fmeus-ingressos");
    });

    test("redireciona em caso de erro de rede para login", async () => {
      mockFetchError();
      const res = await middleware(makeRequest("/meus-ingressos") as never);
      expect(res.status).toBe(307);
    });
  });
});
