---
phase: gsap-scroll-reveal
plan: 01
type: execute
wave: 0
depends_on: []
files_modified:
  - src/lib/gsap-init.ts
  - src/hooks/use-scroll-reveal.ts
  - src/components/reveal-wrapper.tsx
  - src/app/globals.css
autonomous: true
requirements:
  - ANIM-01
  - ANIM-02
  - ANIM-03

must_haves:
  truths:
    - "gsap package is installed and importable"
    - "useScrollReveal hook exists and skips all GSAP when prefers-reduced-motion matches"
    - "RevealWrapper client component exists for use in server pages"
    - "Initial hidden state CSS class .gsap-reveal exists with prefers-reduced-motion override"
  artifacts:
    - path: "src/lib/gsap-init.ts"
      provides: "singleton ScrollTrigger registration"
      exports: ["registerGsap"]
    - path: "src/hooks/use-scroll-reveal.ts"
      provides: "useScrollReveal hook with skip support"
      exports: ["useScrollReveal", "ScrollRevealOptions"]
    - path: "src/components/reveal-wrapper.tsx"
      provides: "RevealWrapper client component for RSC composition"
      exports: ["RevealWrapper"]
    - path: "src/app/globals.css"
      provides: ".gsap-reveal initial CSS state"
      contains: ".gsap-reveal"
  key_links:
    - from: "src/hooks/use-scroll-reveal.ts"
      to: "src/lib/gsap-init.ts"
      via: "registerGsap() call inside useEffect"
      pattern: "registerGsap"
    - from: "src/components/reveal-wrapper.tsx"
      to: "src/hooks/use-scroll-reveal.ts"
      via: "useScrollReveal(ref, revealOptions)"
      pattern: "useScrollReveal"
---

<objective>
Install GSAP and build the animation foundation layer: the `registerGsap` singleton, the
`useScrollReveal` hook, and the `RevealWrapper` RSC-friendly client component. Also add the
`.gsap-reveal` CSS utility class to globals.css.

Purpose: All Wave 1 plans depend on this foundation. Nothing animates until this plan is complete.
Output: Three new source files + one globals.css addition.
</objective>

<execution_context>
@~/.copilot/get-shit-done/workflows/execute-plan.md
@~/.copilot/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/gsap-scroll-reveal/CONTEXT.md
@.planning/phases/gsap-scroll-reveal/RESEARCH.md
@src/app/globals.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install gsap + create gsap-init.ts and useScrollReveal hook</name>
  <files>src/lib/gsap-init.ts, src/hooks/use-scroll-reveal.ts</files>
  <action>
Run `bun add gsap` to install GSAP 3 (free tier — includes ScrollTrigger).

Create `src/lib/gsap-init.ts` (NO "use client" — this is a shared utility):

```typescript
// src/lib/gsap-init.ts
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

/**
 * Register ScrollTrigger exactly once.
 * Call this inside useEffect only — never at module scope.
 */
export function registerGsap(): void {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}
```

Create `src/hooks/use-scroll-reveal.ts` ("use client" required — reads window):

```typescript
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
        // Stagger mode: animate matching child elements
        const targets = el.querySelectorAll(childSelector);
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
```

Notes:
- `once: true` on ScrollTrigger prevents re-firing when user scrolls back up
- `gsap.context(fn, el)` scopes all tweens to `el`, preventing leaks into other components
- `ctx.revert()` kills all tweens and ScrollTriggers created within the context
- Do NOT call `registerGsap()` at module scope — it would run during SSR
- `skip` is destructured **before** `useEffect` so it is a stable primitive in the dep array
  </action>
  <verify>
    <automated>cd /home/jeandias/projects/77ticket && bun run build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - `bun add gsap` succeeds and gsap appears in package.json dependencies
    - `src/lib/gsap-init.ts` exists, exports `registerGsap`
    - `src/hooks/use-scroll-reveal.ts` exists, exports `useScrollReveal` and `ScrollRevealOptions`
    - `ScrollRevealOptions` includes `skip?: boolean` field
    - `useScrollReveal` dep array is `[skip]` (not `[]`) with eslint-disable comment explaining why
    - `if (skip) return;` guard is the first line inside useEffect (before `ref.current` read)
    - Build passes (no TypeScript errors in new files)
  </done>
</task>

<task type="auto">
  <name>Task 2: Create RevealWrapper component + add .gsap-reveal CSS to globals.css</name>
  <files>src/components/reveal-wrapper.tsx, src/app/globals.css</files>
  <action>
Create `src/components/reveal-wrapper.tsx`:

```typescript
// src/components/reveal-wrapper.tsx
"use client";
import { useRef } from "react";
import type { ElementType, ReactNode } from "react";
import { useScrollReveal, type ScrollRevealOptions } from "@/hooks/use-scroll-reveal";

interface RevealWrapperProps extends ScrollRevealOptions {
  children: ReactNode;
  /** HTML element to render as. Default: "div" */
  as?: ElementType;
  className?: string;
}

/**
 * Thin client wrapper for server component pages.
 * Passes server-rendered children through and applies scroll-reveal.
 *
 * Usage in a Server Component:
 *   <RevealWrapper as="header" className="mb-8 ...">
 *     <h1>...</h1>
 *   </RevealWrapper>
 */
export function RevealWrapper({
  children,
  as: Tag = "div",
  className,
  ...revealOptions
}: RevealWrapperProps) {
  const ref = useRef<HTMLElement>(null);
  useScrollReveal(ref, revealOptions);
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
```

Add `.gsap-reveal` CSS to the END of `src/app/globals.css` (after existing rules):

```css
/* ─── GSAP Scroll-Reveal — Initial hidden state ────────────────────────────
   Applied by useScrollReveal via gsap.set() on mount.
   This CSS class is a belt-and-suspenders fallback.
   The hook uses gsap.set() directly, so this class is not required on elements.
   The @media rule ensures reduced-motion users always see content.
   ─────────────────────────────────────────────────────────────────────────── */
.gsap-reveal {
  opacity: 0;
  transform: translateY(3rem); /* 48px — matches DS §03 y: 48 */
}

@media (prefers-reduced-motion: reduce) {
  .gsap-reveal {
    opacity: 1 !important;
    transform: none !important;
  }
}
```

Note: The hook uses `gsap.set()` to control initial state dynamically. The `.gsap-reveal` class is available for elements that want a CSS-only initial hide but is NOT required by the hook itself. Elements animated by the hook do NOT need this class — the hook's `gsap.set()` call handles initial state inline.
  </action>
  <verify>
    <automated>cd /home/jeandias/projects/77ticket && bun run build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - `src/components/reveal-wrapper.tsx` exists and exports `RevealWrapper`
    - `src/app/globals.css` contains `.gsap-reveal` with `opacity: 0` and `transform: translateY(3rem)`
    - `@media (prefers-reduced-motion)` override present in globals.css
    - `bun run build` passes with no errors
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser→DOM | GSAP writes inline styles directly to DOM elements |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-anim-01 | Tampering | gsap.set() inline styles | accept | GSAP only writes opacity/transform — no href, src, or innerHTML. No injection vector. |
| T-anim-02 | Denial of Service | ScrollTrigger memory leak | mitigate | `ctx.revert()` in useEffect cleanup kills all tweens and ScrollTriggers on unmount. `once: true` prevents re-firing. |
| T-anim-03 | Information Disclosure | "use client" boundary | accept | No secrets in animation code. Client bundle exposure is expected. |
</threat_model>

<verification>
1. `bun add gsap` → `package.json` shows `"gsap": "^3.x.x"` in dependencies
2. `src/hooks/use-scroll-reveal.ts` exists — `grep -n "prefers-reduced-motion" src/hooks/use-scroll-reveal.ts` returns a match
3. `grep -n "skip" src/hooks/use-scroll-reveal.ts` returns `skip?: boolean` in interface AND `if (skip) return;` guard AND `}, [skip]);` dep array
4. `src/components/reveal-wrapper.tsx` exists — `grep -n "RevealWrapper" src/components/reveal-wrapper.tsx` returns export
5. `grep -n "gsap-reveal" src/app/globals.css` returns the class definition
6. `bun run build` exits 0 (no TypeScript or module errors)
</verification>

<success_criteria>
- gsap is installed and in package.json
- All three new files exist with correct exports
- globals.css has .gsap-reveal class with reduced-motion override
- Build passes — zero TypeScript errors in new files
- src/hooks/ directory exists (was missing before this plan)
</success_criteria>

<output>
After completion, create `.planning/phases/gsap-scroll-reveal/gsap-scroll-reveal-01-SUMMARY.md`
</output>
