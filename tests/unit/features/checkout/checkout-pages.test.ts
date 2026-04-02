import React from "react";
import { describe, expect, test } from "vitest";

import CheckoutCancelPage from "../../../../src/app/checkout/cancel/page";
import CheckoutSuccessPage from "../../../../src/app/checkout/success/page";

const collectHrefValues = (node: unknown, hrefs: string[] = []): string[] => {
  if (Array.isArray(node)) {
    for (const child of node) {
      collectHrefValues(child, hrefs);
    }

    return hrefs;
  }

  if (!React.isValidElement(node)) {
    return hrefs;
  }

  if (typeof node.props?.href === "string") {
    hrefs.push(node.props.href);
  }

  collectHrefValues(node.props?.children, hrefs);

  return hrefs;
};

describe("checkout return pages", () => {
  test("success page includes a link to meus-ingressos", async () => {
    const page = await CheckoutSuccessPage();
    const hrefs = collectHrefValues(page);

    expect(hrefs).toContain("/meus-ingressos");
  });

  test("cancel page includes guidance links back to events and tickets", async () => {
    const page = await CheckoutCancelPage();
    const hrefs = collectHrefValues(page);

    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/meus-ingressos");
  });
});
