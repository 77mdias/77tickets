import { describe, expect, test } from "vitest";

import {
  extractAnalyticsErrorMessage,
  formatCurrencyPtBrFromCents,
} from "../../../../src/features/admin/analytics-panel";

describe("formatCurrencyPtBrFromCents", () => {
  test("formats cents as pt-BR currency", () => {
    expect(formatCurrencyPtBrFromCents(18000)).toBe(
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(180),
    );
  });
});

describe("extractAnalyticsErrorMessage", () => {
  test("returns backend error message when present", () => {
    expect(
      extractAnalyticsErrorMessage({
        error: {
          code: "not-found",
          message: "Analytics unavailable",
        },
      }),
    ).toBe("Analytics unavailable");
  });

  test("returns fallback for malformed payload", () => {
    expect(extractAnalyticsErrorMessage(null)).toBe(
      "Não foi possível carregar os analytics do evento. Verifique o slug e tente novamente.",
    );
  });
});
