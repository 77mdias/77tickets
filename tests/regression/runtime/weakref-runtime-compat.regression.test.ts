import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const WRANGLER_TOML_PATH = resolve(process.cwd(), "wrangler.toml");
const MIN_COMPATIBILITY_DATE_FOR_RSC = "2026-02-12";
const CROSS_REQUEST_PROMISE_RESOLUTION_FLAG =
  "no_handle_cross_request_promise_resolution";

function readCompatibilityDate(toml: string): string | null {
  const match = toml.match(/^\s*compatibility_date\s*=\s*"([^"]+)"/m);
  return match?.[1] ?? null;
}

function readCompatibilityFlags(toml: string): string[] {
  const match = toml.match(/^\s*compatibility_flags\s*=\s*\[([^\]]*)\]/m);
  if (!match) {
    return [];
  }

  return match[1]
    .split(",")
    .map((entry) => entry.trim())
    .map((entry) => entry.replace(/^"|"$/g, ""))
    .filter((entry) => entry.length > 0);
}

function toUtcTimestamp(dateIso: string): number {
  return Date.parse(`${dateIso}T00:00:00.000Z`);
}

describe("runtime compatibility regression: WeakRef on workerd RSC SSR", () => {
  test("keeps wrangler compatibility_date at or above the Vinext Workers baseline", () => {
    const toml = readFileSync(WRANGLER_TOML_PATH, "utf-8");
    const compatibilityDate = readCompatibilityDate(toml);

    expect(compatibilityDate).not.toBeNull();
    expect(toUtcTimestamp(compatibilityDate as string)).toBeGreaterThanOrEqual(
      toUtcTimestamp(MIN_COMPATIBILITY_DATE_FOR_RSC),
    );
  });

  test("keeps cross-request promise resolution compatibility flag enabled", () => {
    const toml = readFileSync(WRANGLER_TOML_PATH, "utf-8");
    const compatibilityFlags = readCompatibilityFlags(toml);

    expect(compatibilityFlags).toContain(CROSS_REQUEST_PROMISE_RESOLUTION_FLAG);
  });
});
