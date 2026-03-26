import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "vitest";

const repositoryContractFiles = [
  "src/server/repositories/common.repository.contracts.ts",
  "src/server/repositories/event.repository.contracts.ts",
  "src/server/repositories/order.repository.contracts.ts",
  "src/server/repositories/ticket.repository.contracts.ts",
  "src/server/repositories/coupon.repository.contracts.ts",
] as const;

const forbiddenDependencies = ["drizzle", "vinext", "next/", "@neondatabase"];

test("repository contracts stay framework and ORM agnostic", () => {
  for (const relativePath of repositoryContractFiles) {
    const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");

    for (const forbiddenDependency of forbiddenDependencies) {
      expect(source).not.toContain(forbiddenDependency);
    }
  }
});
