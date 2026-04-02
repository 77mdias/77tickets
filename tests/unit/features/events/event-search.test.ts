import { describe, expect, test } from "vitest";

import {
  buildDiscoveryHref,
  readDiscoveryFilters,
} from "../../../../src/features/events/event-search";

describe("readDiscoveryFilters", () => {
  test("returns trimmed discovery filters from the URL", () => {
    const filters = readDiscoveryFilters(
      new URLSearchParams({
        q: "  festival  ",
        date: " 2027-06-01 ",
        location: "  Sao Paulo ",
        category: "  shows ",
      }),
    );

    expect(filters).toEqual({
      q: "festival",
      date: "2027-06-01",
      location: "Sao Paulo",
      category: "shows",
    });
  });
});

describe("buildDiscoveryHref", () => {
  test("omits empty filters and keeps the active query parameters", () => {
    const href = buildDiscoveryHref("/", {
      q: "festival",
      date: "",
      location: "Sao Paulo",
      category: "",
    });

    expect(href).toBe("/?q=festival&location=Sao+Paulo");
  });
});
