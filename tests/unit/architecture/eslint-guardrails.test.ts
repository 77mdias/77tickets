import { resolve } from "node:path";

import { ESLint } from "eslint";
import { describe, expect, test } from "vitest";

const lintCode = async (code: string, filePath: string) => {
  const eslint = new ESLint({
    overrideConfigFile: resolve(process.cwd(), "eslint.config.mjs"),
  });

  const [result] = await eslint.lintText(code, {
    filePath: resolve(process.cwd(), filePath),
  });

  return result;
};

describe("architectural boundary guardrails", () => {
  test("fails lint when the API layer imports repositories directly", async () => {
    const result = await lintCode(
      'import { type OrderRepository } from "../repositories/order.repository.contracts";\n',
      "src/server/api/bad-handler.ts",
    );

    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.messages.some((message) => message.ruleId === "no-restricted-imports")).toBe(true);
  });

  test("fails lint when the application layer imports the API layer", async () => {
    const result = await lintCode(
      'import { parseInput } from "../api/validation";\n',
      "src/server/application/bad-use-case.ts",
    );

    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.messages.some((message) => message.ruleId === "no-restricted-imports")).toBe(true);
  });

  test("fails lint when the UI layer imports server code", async () => {
    const result = await lintCode(
      'import { createCreateOrderHandler } from "@/src/server/api/create-order.handler";\n',
      "src/app/bad-page.tsx",
    );

    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.messages.some((message) => message.ruleId === "no-restricted-imports")).toBe(true);
  });

  test("allows a valid API layer import from the application layer", async () => {
    const result = await lintCode(
      'import type { CreateOrderUseCase } from "../application/use-cases";\n',
      "src/server/api/good-handler.ts",
    );

    expect(result.errorCount).toBe(0);
  });
});
