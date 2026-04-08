import { describe, expect, test } from "vitest";

import { toScopedSelector } from "@/hooks/use-scroll-reveal";

describe("toScopedSelector", () => {
  test("prefixa '> tag' com ':scope'", () => {
    expect(toScopedSelector("> article")).toBe(":scope > article");
  });

  test("prefixa '> .class' com ':scope'", () => {
    expect(toScopedSelector("> .card")).toBe(":scope > .card");
  });

  test("prefixa '> *' com ':scope'", () => {
    expect(toScopedSelector("> *")).toBe(":scope > *");
  });

  test("não modifica seletor normal sem '>'", () => {
    expect(toScopedSelector(".card")).toBe(".card");
  });

  test("não modifica seletor com '>' no meio", () => {
    expect(toScopedSelector(".parent > .child")).toBe(".parent > .child");
  });

  test("respeita espaço inicial antes de '>'", () => {
    expect(toScopedSelector("  > article")).toBe(":scope   > article");
  });

  test("não modifica seletor de tag simples", () => {
    expect(toScopedSelector("article")).toBe("article");
  });
});
