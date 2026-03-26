import { describe, expect, test } from "vitest";

describe("schema module", () => {
  test("is importable and exports a plain object as module namespace", async () => {
    const schema = await import("../../../../src/server/infrastructure/db/schema");

    expect(schema).toBeDefined();
    expect(typeof schema).toBe("object");
  });

  test("has no forbidden infrastructure imports in contract files (regression guard)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const schemaSource = readFileSync(
      resolve(process.cwd(), "src/server/infrastructure/db/schema.ts"),
      "utf8"
    );

    // Schema must not accidentally import application or domain layers
    expect(schemaSource).not.toContain("from \"../../application");
    expect(schemaSource).not.toContain("from \"../../domain");
    expect(schemaSource).not.toContain("from \"../../api");
  });
});
