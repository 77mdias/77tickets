import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

import { describe, expect, test } from "vitest";

const sourceRoot = resolve(process.cwd(), "src");
const sourceExtensions = new Set([".ts", ".tsx"]);

const collectSourceFiles = (dir: string): string[] => {
  const files: string[] = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }

    if (sourceExtensions.has(extname(fullPath))) {
      files.push(fullPath);
    }
  }

  return files;
};

describe("import alias normalization guardrail", () => {
  test("does not allow '@/src/' import prefixes in source files", () => {
    const offenders = collectSourceFiles(sourceRoot).filter((filePath) =>
      readFileSync(filePath, "utf8").includes('"@/src/'),
    );

    expect(offenders).toEqual([]);
  });
});
