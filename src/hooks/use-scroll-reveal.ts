// src/hooks/use-scroll-reveal.ts
"use client";
import { useEffect } from "react";
import type { RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { registerGsap } from "@/lib/gsap-init";

export interface ScrollRevealOptions {
  /**
   * CSS selector for child elements to stagger (e.g. "> article").
   * Omit for single-element mode.
   */
  childSelector?: string;
  /** Default: 0.1 (100ms) — gap between each staggered child */
  stagger?: number;
  /** Default: 48 — initial Y offset in pixels */
  y?: number;
  /** Default: 0.9 — animation duration in seconds */
  duration?: number;
  /** Default: "power3.out" */
  ease?: string;
  /** Default: "top 85%" — ScrollTrigger start position */
  start?: string;
  /**
   * When true, hook is a no-op — registers nothing and returns early.
   * Use this for async-loaded content (e.g. `skip: isInitialLoading`).
   * The effect dep array is `[skip]`, so the hook re-fires automatically
   * when `skip` flips from `true` to `false` — at which point the real
   * DOM elements exist and GSAP can target them.
   */
  skip?: boolean;
}

/**
 * Ensures that a CSS selector starting with `>` is scoped correctly for use in
 * `element.querySelectorAll()`. Browsers and JSDOM reject bare `> child`
 * selectors — they require the `:scope` pseudo-class prefix.
 *
 * @example toScopedSelector("> article") // → ":scope > article"
 * @example toScopedSelector(".card")     // → ".card" (unchanged)
 */
export const toScopedSelector = (selector: string): string =>
  selector.trimStart().startsWith(">") ? `:scope ${selector}` : selector;

/**
 * Attach a scroll-reveal entrance animation to a DOM element ref.
 * Respects prefers-reduced-motion — skips all GSAP if matched.
 * Cleanup: gsap.context().revert() kills tweens + ScrollTriggers on unmount.
 *
 * Dep array note: `[skip]` (not `[]`).
 * - For callers that never pass `skip`, `skip` is always `undefined` (falsy)
 *   and the effect fires once on mount — same behaviour as `[]`.
 * - For callers that pass `skip: isInitialLoading`, the effect fires twice:
 *   once (no-op) while loading, then again when loading completes and DOM
 *   articles exist. This is intentional and required — the eslint-disable
 *   comment below remains correct because the only dep we track is `skip`;
 *   we intentionally ignore `ref` and `options` object identity.
 *
 * @param ref - React ref pointing to the element (or container)
 * @param options - Override default animation parameters
 */
export function useScrollReveal<T extends Element>(
  ref: RefObject<T | null>,
  options: ScrollRevealOptions = {},
): void {
  const {
    childSelector,
    stagger = 0.1,
    y = 48,
    duration = 0.9,
    ease = "power3.out",
    start = "top 85%",
    skip = false,
  } = options;

  useEffect(() => {
    // skip: true → caller signals DOM isn't ready yet (e.g. async data loading).
    // Return early without registering anything; effect will re-run when skip → false.
    if (skip) return;

    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion: skip GSAP entirely.
    // Elements stay at natural opacity/position — no transitions.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    registerGsap();

    const ctx = gsap.context(() => {
      if (childSelector) {
        // Prefix ">" with ":scope" so direct-child selectors work in all environments
        // (JSDOM, older browsers). e.g. "> article" → ":scope > article".
        const targets = el.querySelectorAll(toScopedSelector(childSelector));
        if (targets.length === 0) return;
        gsap.set(targets, { opacity: 0, y });
        ScrollTrigger.create({
          trigger: el,
          start,
          once: true,
          onEnter: () => {
            gsap.to(targets, { opacity: 1, y: 0, duration, ease, stagger });
          },
        });
      } else {
        // Single-element mode
        gsap.set(el, { opacity: 0, y });
        ScrollTrigger.create({
          trigger: el,
          start,
          once: true,
          onEnter: () => {
            gsap.to(el, { opacity: 1, y: 0, duration, ease });
          },
        });
      }
    }, el);

    return () => ctx.revert();
    // [skip] dep: effect re-runs only when the skip flag changes (async data ready).
    // ref and options object identity are intentionally excluded — scroll-reveal is
    // a one-shot entrance animation; re-running on re-renders would reset visibility.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);
}
