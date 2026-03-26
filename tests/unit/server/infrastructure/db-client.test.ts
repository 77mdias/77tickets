import { describe, expect, test, vi } from "vitest";

import { createDb } from "../../../../src/server/infrastructure/db/client";

vi.mock("@neondatabase/serverless", () => ({
  neon: vi.fn(() => vi.fn()),
}));

describe("createDb", () => {
  test("returns a Drizzle ORM instance with query methods when given a database URL", () => {
    const db = createDb("postgresql://user:pass@localhost/testdb");

    expect(db).toBeDefined();
    expect(typeof db.select).toBe("function");
    expect(typeof db.insert).toBe("function");
    expect(typeof db.update).toBe("function");
    expect(typeof db.delete).toBe("function");
  });

  test("each call returns a new independent db instance", () => {
    const db1 = createDb("postgresql://user:pass@localhost/db1");
    const db2 = createDb("postgresql://user:pass@localhost/db2");

    expect(db1).not.toBe(db2);
  });

  test("forwards the provided URL to the Neon client constructor", async () => {
    const { neon } = await import("@neondatabase/serverless");
    const url = "postgresql://user:pass@neon.tech/testdb";

    createDb(url);

    expect(vi.mocked(neon)).toHaveBeenCalledWith(url);
  });
});
