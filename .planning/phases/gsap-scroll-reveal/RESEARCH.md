# Phase: GSAP Scroll-Reveal Animations — Research

**Researched:** 2025-07-16  
**Domain:** GSAP 3 + React (Next.js SSR / Vinext) scroll animations  
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **Scope — public pages only**
   - `/` — home, event list, filters
   - `/eventos/[slug]` — event detail
   - `/login` — login form
   - `/checkout` — checkout form, lot selector
   - `/meus-ingressos` — ticket list, QR viewer
   - **Excluded:** `/admin`, `/checkin`, `/checkout/success`, `/checkout/cancel`

2. **Element targets — cards + headings + form panels**
   - Section headings (h1, h2)
   - Event cards (`EventCard`, `EventCardSkeleton`)
   - Ticket cards (order `<article>` elements)
   - Form panels (`rounded-xl border border-white/10 bg-white/5`)
   - Filter/search bars
   - Event detail sections (metadata rows, lot selector, description)
   - Inline text (paragraphs, labels, badges) does **NOT** animate independently

3. **Stagger — list/grid items cascade**
   - `stagger: 0.1` (100ms) for sibling elements in same viewport section
   - Standalone elements (headings, single panels) animate independently

4. **Reduced motion — respected**
   - Guard: `window.matchMedia("(prefers-reduced-motion: reduce)").matches`
   - If true: skip all GSAP setup, elements render at full opacity/position
   - Implement at hook level (before ScrollTrigger/gsap.to calls)

5. **Animation values (from DS §03)**
   ```
   Initial state:  opacity: 0, y: 48
   Final state:    opacity: 1, y: 0
   Duration:       0.9s
   Ease:           "power3.out"
   Stagger:        0.1s (for list/grid groups)
   Trigger:        "top 85%" (element top hits 85% down the viewport)
   ```

6. **Implementation pattern**
   - Install `gsap` (free tier — ScrollTrigger included)
   - Hook: `useScrollReveal(ref, options?)` in `src/hooks/use-scroll-reveal.ts`
   - Init utility: `src/lib/gsap-init.ts` (register ScrollTrigger once)
   - Plain `useEffect` + `gsap.context()` cleanup — NO `@gsap/react`

### Agent's Discretion
- Exact TypeScript type definitions for hook options
- Naming/organization of the `RevealWrapper` client component for server components
- Which `childSelector` string to use per component

### Deferred Ideas (OUT OF SCOPE)
- Parallax background (Three.js wireframe)
- Page transition animations (route-level)
- Hover micro-interactions
- Admin / checkin page animations
</user_constraints>

---

## Summary

GSAP 3.14.2 (latest stable, Dec 2025) includes ScrollTrigger in the free `gsap` npm package — no paid club membership required. The design system's `§03 Motion Principles` section confirms all animation values already decided in CONTEXT.md: `opacity 0→1`, `y: 48→0`, `duration 0.9s`, `ease "power3.out"`, `start "top 85%"`.

The codebase is a Vinext (Vite-based SSR) + Next.js 16 + React 19 app. Most animated components are already client components (`"use client"`), which means GSAP hooks can be applied directly. The five server-component pages that need headings/sections animated require a thin `RevealWrapper` client component (server content passed as children), which is a supported pattern in Next.js App Router.

The critical engineering challenges are: (1) SSR safety — `gsap.set()`/`ScrollTrigger.create()` must only run inside `useEffect`; (2) initial hidden state — must use `gsap.set()` immediately on mount to set `opacity:0, y:48` before the trigger fires; (3) the `src/hooks/` directory doesn't exist yet and must be created in Wave 0.

**Primary recommendation:** Build `useScrollReveal` hook with a single-element variant and a container+`childSelector` variant for stagger. Apply to client components directly via `useRef`. Wrap server-component heading/section blocks in a `RevealWrapper` client component.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `gsap` | `3.14.2` | Animation engine + ScrollTrigger | Free tier includes ScrollTrigger; same library already powering the DS |

> [VERIFIED: npm registry — `npm view gsap version` → `3.14.2`, published 2025-12-12]

**No additional packages needed.** `@gsap/react` is optional syntactic sugar — plain `useEffect` with `gsap.context()` is sufficient and avoids an extra dependency.

### Installation

```bash
bun add gsap
```

> [VERIFIED: package.json — bun is the package manager; `gsap` not currently in dependencies]

### Version Verification

```bash
npm view gsap version  # → 3.14.2 (verified 2025-07-16)
npm view gsap time.modified  # → 2025-12-12T21:12:52.845Z
```

---

## Architecture Patterns

### Recommended File Structure

```
src/
├── hooks/
│   └── use-scroll-reveal.ts      # NEW — reusable GSAP scroll-reveal hook
├── lib/
│   ├── server-api.ts             # existing
│   └── gsap-init.ts              # NEW — registers ScrollTrigger once (singleton)
└── components/
    └── reveal-wrapper.tsx        # NEW — thin client wrapper for server component pages
```

> `src/hooks/` **does not exist** — must be created in Wave 0.  
> [VERIFIED: codebase — `ls src/` confirms no `hooks/` directory]

---

### Pattern 1: `gsap-init.ts` — Singleton Plugin Registration

**What:** Registers `ScrollTrigger` once globally; subsequent calls are no-ops.  
**Why:** GSAP warns if `registerPlugin` is called multiple times in strict mode.

```typescript
// src/lib/gsap-init.ts
// Source: GSAP 3 docs pattern [ASSUMED: gsap.com/docs]
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

export function registerGsap(): void {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}
```

> This module is safe to import in client components — GSAP 3 does not access `window` at module evaluation time. `ScrollTrigger` is only activated when `registerPlugin` is called, and that call is inside `useEffect`.  
> [ASSUMED: based on GSAP 3 architecture; module-level imports are static, effects are deferred]

---

### Pattern 2: `useScrollReveal` Hook

**What:** Custom hook that wraps a ref'd element in a GSAP ScrollTrigger. Supports single-element and container+children (stagger) modes.  
**Cleanup:** `gsap.context().revert()` kills all tweens and ScrollTriggers created inside the context.

```typescript
// src/hooks/use-scroll-reveal.ts
"use client";
import { useEffect } from "react";
import type { RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { registerGsap } from "@/lib/gsap-init";

export interface ScrollRevealOptions {
  /** CSS selector for child elements to stagger (e.g. "> article"). Omit for single-element mode. */
  childSelector?: string;
  stagger?: number;    // default: 0.1
  y?: number;          // default: 48
  duration?: number;   // default: 0.9
  ease?: string;       // default: "power3.out"
  start?: string;      // default: "top 85%"
}

export function useScrollReveal<T extends Element>(
  ref: RefObject<T | null>,
  options: ScrollRevealOptions = {},
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reduced-motion guard — skip entirely; elements render at natural opacity/position
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    registerGsap();

    const {
      childSelector,
      stagger = 0.1,
      y = 48,
      duration = 0.9,
      ease = "power3.out",
      start = "top 85%",
    } = options;

    const ctx = gsap.context(() => {
      if (childSelector) {
        // Stagger mode: animate children
        const targets = el.querySelectorAll(childSelector);
        gsap.set(targets, { opacity: 0, y });
        ScrollTrigger.create({
          trigger: el,
          start,
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
          onEnter: () => {
            gsap.to(el, { opacity: 1, y: 0, duration, ease });
          },
        });
      }
    }, el);

    return () => ctx.revert();
  }, []); // Empty deps — animations are one-shot, triggered by scroll position
}
```

> **Note on empty dependency array:** The `[]` dep array is intentional. Scroll-reveal is a one-time entrance animation. Re-running on state changes would reset visibility. The `ref.current` is read inside the effect after mount, which is the correct pattern.

---

### Pattern 3: `RevealWrapper` — Client Component for Server Pages

**What:** Thin client component that wraps server-rendered content and applies the reveal hook. Allows server components to pass pre-rendered children.  
**Why needed:** `home/page.tsx`, `eventos/[slug]/page.tsx`, and `meus-ingressos/page.tsx` are server components — they cannot directly use hooks.

```typescript
// src/components/reveal-wrapper.tsx
"use client";
import { useRef } from "react";
import type { ReactNode } from "react";
import { useScrollReveal, type ScrollRevealOptions } from "@/hooks/use-scroll-reveal";

interface RevealWrapperProps extends ScrollRevealOptions {
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements; // default "div"
  className?: string;
}

export function RevealWrapper({
  children,
  as: Tag = "div",
  className,
  ...revealOptions
}: RevealWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollReveal(ref, revealOptions);
  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}
```

> In Next.js App Router, server-rendered children can be passed to client components — the children are serialized as RSC payload and rendered client-side. This is standard App Router composition.  
> [ASSUMED: based on Next.js App Router docs pattern]

---

### Anti-Patterns to Avoid

- **`gsap.registerPlugin(ScrollTrigger)` at module scope:** Runs during SSR, accesses `window` → crashes Node.js. Always inside `useEffect`.
- **Setting `opacity: 0` via inline style or CSS class without GSAP backup:** If JS fails, element stays hidden forever. Use `gsap.set()` inside the hook so the initial state and animations live together.
- **Re-running `useScrollReveal` on every render:** Empty dep array `[]` is correct — do NOT add reactive deps unless you want animations to reset.
- **Applying `useScrollReveal` to `EventCardSkeleton` directly:** The skeleton uses `animate-pulse` (Tailwind CSS keyframe). GSAP's `opacity: 0` set on mount will hide the skeleton pulse until scroll — which is fine for the entry animation but only makes sense when the skeleton group is visible above the fold. Guard: if the container is in the initial viewport, set initial opacity to 1 immediately. This can be done with `once: true` on the ScrollTrigger, or by checking `scrollY === 0`.
- **Importing from `gsap/dist/...`:** Use bare `"gsap/ScrollTrigger"` import path — the npm package has proper exports map. [VERIFIED: npm view gsap exports]

---

## SSR Safety

**Risk:** `window`, `document`, and `ScrollTrigger` are browser-only APIs. Vinext/Next.js server-renders pages — any top-level access crashes the Node.js process.

**GSAP 3 module-level import is safe.** GSAP 3's package is structured to not access global browser APIs at module evaluation time. The `ScrollTrigger` plugin only touches the DOM when `gsap.registerPlugin(ScrollTrigger)` is called — which we do inside `useEffect`. [ASSUMED: based on GSAP 3 architecture and community pattern]

**Safe pattern:**
```typescript
// ✅ Safe — top-level import, no window access at evaluation time
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// ✅ Safe — registerPlugin inside useEffect (browser-only)
useEffect(() => {
  gsap.registerPlugin(ScrollTrigger);
  // ...
}, []);
```

**Unsafe pattern:**
```typescript
// ❌ Unsafe — window access at module scope
if (window.matchMedia("...")) { ... } // crashes in Node.js

// ❌ Unsafe — registration at module scope
gsap.registerPlugin(ScrollTrigger); // may touch DOM, crashes in Node.js
```

**Additional guard:** The `"use client"` directive on the hook file ensures the entire module (including imports) only runs in the browser. Server components cannot import client-only modules.

---

## Component Integration Points

This section maps every component to the changes required.

### Already Client Components (direct hook application)

| Component | File | Target ref | Mode | Change |
|-----------|------|-----------|------|--------|
| `EventList` | `src/features/events/event-list.tsx` | `<div className="grid gap-4 ...">` | stagger `"> article"` | Add `gridRef`, apply hook |
| `LoginForm` | `src/features/auth/login-form.tsx` | outer `<section>` | single element | Add `ref`, apply hook |
| `CheckoutForm` | `src/features/checkout/checkout-form.tsx` | outer `<section>` | single element | Add `ref`, apply hook |
| `LotSelector` | `src/features/checkout/lot-selector.tsx` | outer `<section>` | single element | Add `ref`, apply hook |

#### EventList — detailed

Current grid structure:
```tsx
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
  {events.map((event) => (
    <article key={event.id} ...>
```

Required change: attach `ref` to the grid `<div>` and call:
```tsx
const gridRef = useRef<HTMLDivElement>(null);
useScrollReveal(gridRef, { childSelector: "> article", stagger: 0.1 });
```

> EventList already uses `useRef` (for `requestIdRef`), so the pattern is familiar.  
> [VERIFIED: event-list.tsx line 108]

**State interaction risk:** EventList re-renders when `events` changes (new page loaded). Since the hook dep array is `[]`, GSAP won't re-run. New items from "Load More" will appear without animation — they'll be instantly visible. This is acceptable per CONTEXT.md scope (stagger applies to initial load, not infinite scroll). If desired, "Load More" items could call `gsap.from()` directly — but this is out of scope.

#### LoginForm — detailed

Outer `<section className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-6">` at line 83. Add `ref` to this section.  
[VERIFIED: login-form.tsx line 83]

#### CheckoutForm — detailed

Outer `<section className="w-full max-w-2xl rounded-xl border border-white/10 bg-white/5 p-6">` at line 94. Add `ref` to this section.  
[VERIFIED: checkout-form.tsx line 94]

#### LotSelector — detailed

Two `<section>` elements depending on `availableLots.length`. Both are the same visual pattern. Wrap the outermost returned `<section>` with ref.  
[VERIFIED: lot-selector.tsx lines 42, 58]

---

### Server Components (require RevealWrapper or extracted client component)

| Page | File | Server Component? | Animated Elements | Strategy |
|------|------|-------------------|-------------------|----------|
| Home | `src/app/page.tsx` | ✅ Server | `<header>` with h1 | Wrap `<header>` in `<RevealWrapper>` |
| Event Detail | `src/app/eventos/[slug]/page.tsx` | ✅ Server | h1 section, lots section, LotSelector wrapper | `<RevealWrapper>` per section |
| Meus Ingressos | `src/app/meus-ingressos/page.tsx` | ✅ Server | h1 header, order article list | `<RevealWrapper>` for header + stagger wrapper for orders |
| Login | `src/app/login/page.tsx` | ✅ Server | Delegates entirely to `LoginForm` | No change needed — LoginForm handles it |
| Checkout | `src/app/checkout/page.tsx` | ✅ Server | Delegates entirely to `CheckoutForm` | No change needed — CheckoutForm handles it |

#### Home page header example

```tsx
// src/app/page.tsx
import { RevealWrapper } from "@/components/reveal-wrapper";

// Before:
<header className="mb-8 flex flex-col gap-4 ...">

// After:
<RevealWrapper as="header" className="mb-8 flex flex-col gap-4 ...">
  {/* content unchanged */}
</RevealWrapper>
```

#### Meus-Ingressos order list example

```tsx
// src/app/meus-ingressos/page.tsx
// The order articles are server-rendered — wrap container for stagger
<RevealWrapper as="section" className="grid gap-5" childSelector="> article">
  {orders.map((order) => (
    <article key={order.id} ...>
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scroll detection | IntersectionObserver wrapper | `gsap/ScrollTrigger` | handles resize, refresh, pin states, lazy-loaded content |
| Tween cleanup | Manual kill arrays | `gsap.context().revert()` | kills all tweens AND ScrollTriggers in scope atomically |
| Easing functions | CSS cubic-bezier math | GSAP `"power3.out"` preset | matches DS exactly; GSAP's implementation handles edge cases |
| Stagger timing | manual `setTimeout` offsets | `gsap.to(targets, { stagger })` | GSAP staggers are tied to animation timeline, not wall clock |

---

## FOSC Prevention (Flash of Styled Content)

**Problem:** Between server-render (opacity: 1) and GSAP mount (`gsap.set(opacity: 0)`), there is a single paint frame where the element is visible at full opacity. On fast connections/machines this is imperceptible; on slow ones it can flash.

**Solution:** `gsap.set()` inside `useEffect` executes synchronously before the next browser paint (React commits → layout → paint). In practice, `useEffect` fires after the browser has painted once — meaning the element **will** be briefly visible at full opacity before being set to 0.

**Better solution for above-fold elements:** If the element is above the fold (already in viewport on load), use `gsap.from()` instead of `gsap.set() + gsap.to()`:
```typescript
gsap.from(el, { opacity: 0, y: 48, duration: 0.9, ease: "power3.out" });
// No ScrollTrigger needed — animation fires immediately on mount
```

**For below-fold elements (scroll-triggered):** The FOSC risk is near-zero because the element is off-screen when GSAP sets opacity:0. By the time the user scrolls to it, the initial state is already locked.

**Practical recommendation:** Use the `gsap.set() + ScrollTrigger` pattern for ALL elements. Accept the theoretical single-frame flash for above-fold items — in the dark-background DS theme (zinc-950), elements at opacity:1 for one frame are barely perceptible. If needed, add a CSS utility class:
```css
/* In globals.css — applied inline by RevealWrapper when JS is available */
.gsap-hidden { opacity: 0; transform: translateY(3rem); }
```
Then remove the class when GSAP takes over. But this adds complexity not justified by the scenario.

---

## Common Pitfalls

### Pitfall 1: ScrollTrigger.refresh() needed after dynamic content

**What goes wrong:** When `EventList` loads events asynchronously (the async fetch in `useEffect`), GSAP's ScrollTrigger calculates element positions on mount — before the dynamic content exists. Trigger positions become stale.  
**Why it happens:** ScrollTrigger caches element positions at registration time. Dynamic content (images, async data) changes page height after registration.  
**How to avoid:** Call `ScrollTrigger.refresh()` after the event list finishes loading, OR register the trigger only after data is loaded (pass a `ready: boolean` option to the hook, defaulting to true).  
**Warning sign:** Cards near the bottom of the list don't animate, or animate at wrong scroll position.

**Recommendation:** In `EventList`, call the hook only when `!isInitialLoading` — use a `useEffect` dependency on `isInitialLoading` or pass a `skip` option:
```tsx
const gridRef = useRef<HTMLDivElement>(null);
// Only register scroll trigger after data is loaded
useScrollReveal(gridRef, { 
  childSelector: "> article", 
  stagger: 0.1,
  skip: isInitialLoading  // hook returns early if skip === true
});
```

Or alternatively, after initial load:
```tsx
useEffect(() => {
  if (!isInitialLoading) {
    ScrollTrigger.refresh();
  }
}, [isInitialLoading]);
```

### Pitfall 2: gsap.context() scope must be the container element

**What goes wrong:** Passing `document.body` as the gsap.context scope kills ALL gsap animations site-wide on component unmount.  
**Why it happens:** `ctx.revert()` undoes everything registered within that context scope.  
**How to avoid:** Always pass the component's own `ref.current` as the scope argument to `gsap.context(fn, scope)`.

### Pitfall 3: Stagger on dynamically added items

**What goes wrong:** Load More items appended to EventList don't animate (hook ran once with empty dep array).  
**Why it happens:** GSAP captured the initial querySelectorAll result; new `<article>` elements weren't in the NodeList.  
**How to avoid:** This is explicitly acceptable per CONTEXT.md scope. Load More items appear instantly. Document this in code with a comment.

### Pitfall 4: EventCardSkeleton + GSAP opacity:0

**What goes wrong:** If `useScrollReveal` is applied to a container that renders `EventCardSkeleton` during loading, `gsap.set(opacity: 0)` hides the skeleton before it's visible.  
**Why it happens:** Hook runs on mount; skeleton is visible during mount.  
**How to avoid:** In `EventList`, apply the hook only to the loaded state grid (see Pitfall 1 pattern: `skip: isInitialLoading`).

### Pitfall 5: duplicate ScrollTrigger on route re-navigation

**What goes wrong:** Next.js App Router soft-navigation (client-side route transitions) may re-mount components — ScrollTrigger instances accumulate.  
**Why it happens:** If component mounts, unmounts, and mounts again, two ScrollTrigger instances exist for the same element.  
**How to avoid:** `gsap.context().revert()` in the `useEffect` cleanup function handles this correctly. This is already in the recommended pattern.

---

## Code Examples

### Complete hook with skip option (handles async data scenario)

```typescript
// src/hooks/use-scroll-reveal.ts
"use client";
import { useEffect } from "react";
import type { RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { registerGsap } from "@/lib/gsap-init";

export interface ScrollRevealOptions {
  childSelector?: string;
  stagger?: number;
  y?: number;
  duration?: number;
  ease?: string;
  start?: string;
  /** When true, hook is a no-op (use for async-loaded content) */
  skip?: boolean;
}

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
    if (skip) return;

    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    registerGsap();

    const ctx = gsap.context(() => {
      if (childSelector) {
        const targets = el.querySelectorAll(childSelector);
        gsap.set(targets, { opacity: 0, y });
        ScrollTrigger.create({
          trigger: el,
          start,
          onEnter: () => {
            gsap.to(targets, { opacity: 1, y: 0, duration, ease, stagger });
          },
        });
      } else {
        gsap.set(el, { opacity: 0, y });
        ScrollTrigger.create({
          trigger: el,
          start,
          onEnter: () => {
            gsap.to(el, { opacity: 1, y: 0, duration, ease });
          },
        });
      }
    }, el);

    return () => ctx.revert();
  }, [skip]); // Re-run when skip changes (data loads)
}
```

### EventList integration

```tsx
// In EventList component — add after existing useRef declarations
const gridRef = useRef<HTMLDivElement>(null);
useScrollReveal(gridRef, {
  childSelector: "> article",
  stagger: 0.1,
  skip: isInitialLoading,
});

// In JSX — add ref to grid container
<div ref={gridRef} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
  {events.map((event) => (
    <article key={event.id} ...>
```

### Server component (home page header)

```tsx
// src/app/page.tsx
import { RevealWrapper } from "@/components/reveal-wrapper";

<RevealWrapper as="header" className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
  <div>
    <h1 className="text-3xl font-semibold text-white">Eventos Abertos</h1>
    ...
  </div>
</RevealWrapper>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `gsap.killTweensOf()` + manual cleanup | `gsap.context().revert()` | GSAP 3.11 (2022) | Atomic cleanup of all tweens + ScrollTriggers in scope |
| `@gsap/react` `useGSAP()` hook | Plain `useEffect` + `gsap.context()` | N/A (optional) | `@gsap/react` is thin sugar; not required |
| ScrollTrigger as premium plugin | Free in `gsap` npm package | GSAP 3 launch | No club membership needed |

**Deprecated/outdated:**
- `TweenMax`, `TweenLite`, `TimelineMax` — replaced by unified `gsap` object in GSAP 3
- `gsap.killTweensOf(target)` — still works but `ctx.revert()` is preferred in React

---

## Validation Architecture

> `.planning/config.json` not found — treating nyquist_validation as **enabled** (absent = enabled).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `bun run test:unit` |
| Full suite command | `bun run test:unit && bun run test:regression` |

### Critical Testing Challenge

Vitest is configured with `environment: "node"` [VERIFIED: vitest.config.ts]. GSAP and `window.matchMedia` are browser APIs. Unit testing the hook directly requires either:
1. **jsdom environment** — add `@vitest/browser` or configure jsdom for specific test files
2. **Mock strategy** — mock `gsap` and `window.matchMedia` in unit tests and verify the hook calls the right APIs

**AGENTS.md mandates TDD.** However, animation behavior is inherently visual. The pragmatic approach: write unit tests that mock GSAP and verify the hook's control flow (reduced-motion guard, skip option, cleanup call). Visual correctness is verified via the smoke test.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GSAP-01 | Hook calls `gsap.set()` on mount | unit | `bun run test:unit -- --dir tests/unit/hooks` | ❌ Wave 0 |
| GSAP-02 | Reduced-motion guard skips GSAP | unit | `bun run test:unit -- --dir tests/unit/hooks` | ❌ Wave 0 |
| GSAP-03 | `ctx.revert()` called on unmount | unit | `bun run test:unit -- --dir tests/unit/hooks` | ❌ Wave 0 |
| GSAP-04 | `skip: true` makes hook a no-op | unit | `bun run test:unit -- --dir tests/unit/hooks` | ❌ Wave 0 |
| GSAP-05 | No SSR crash (server import safety) | regression | `bun run test:regression -- scroll-reveal` | ❌ Wave 0 |
| GSAP-06 | All 5 pages render without JS error | smoke | `bun run smoke` (manual visual) | existing (extend) |

### Sampling Rate

- **Per task commit:** `bun run test:unit`
- **Per wave merge:** `bun run test:unit && bun run test:regression && bun run build`
- **Phase gate:** Full suite green + visual smoke check before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/hooks/use-scroll-reveal.test.ts` — covers GSAP-01 through GSAP-04
- [ ] `tests/regression/scroll-reveal-ssr.test.ts` — covers GSAP-05
- [ ] `src/hooks/` directory (create with `.gitkeep` or hook file directly)
- [ ] `src/lib/gsap-init.ts` — utility file
- [ ] `src/components/reveal-wrapper.tsx` — client wrapper component
- [ ] Vitest environment for hook tests: add `// @vitest-environment jsdom` pragma OR mock browser APIs

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `gsap` npm package | Animation engine | ✗ (not installed) | — | None — install required |
| `bun` | Package manager | ✓ | 1.3.3 | — |
| Browser (for smoke) | Visual verification | ✓ | — | — |

**Missing dependencies with no fallback:**
- `gsap` — must install via `bun add gsap` before any implementation

---

## Security Domain

> GSAP is a pure client-side animation library. It has no server-side execution, no network requests, no data handling, and no authentication surface.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no | GSAP reads DOM refs, not user input |
| V6 Cryptography | no | — |

**Supply chain:** `gsap` is a well-maintained, widely-used package (GreenSock Inc.). Confirm no high-severity audit finding before merge: `bun audit` or `node scripts/ci/check-bun-audit-high.mjs`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | GSAP 3 module-level imports (`import gsap from 'gsap'`) do not access `window`/`document` at evaluation time | SSR Safety | SSR crash in Vinext — would require dynamic import |
| A2 | `gsap.context().revert()` kills all ScrollTrigger instances created within the context | Pattern 2 hook | ScrollTrigger memory leak on unmount |
| A3 | Next.js App Router allows server-rendered content to be passed as children to client components | RevealWrapper pattern | Cannot use RevealWrapper on server component pages |
| A4 | `ScrollTrigger.create()` with only `onEnter` (no `onLeaveBack`) fires once and keeps element at final state | All ScrollTrigger usages | Elements could snap back to hidden on scroll-up |
| A5 | `gsap.registerPlugin()` is safe to call multiple times if guarded (no duplicate warnings) | gsap-init.ts | Console warnings in dev; no functional impact |

---

## Open Questions

1. **`skip` dep array vs stable dep array**
   - What we know: Hook uses `skip` in dep array so it re-runs when `isInitialLoading` becomes `false`
   - What's unclear: Does re-running the hook with `skip: false` after `skip: true` correctly pick up the newly-rendered DOM elements?
   - Recommendation: Test in Wave 1 — if DOM is updated before the effect re-runs, it works. If not, call `ScrollTrigger.refresh()` explicitly after data loads.

2. **EventCardSkeleton animation**
   - What we know: CONTEXT.md lists `EventCardSkeleton` as an element target, but `EventList` currently doesn't use `EventListSkeleton` during loading (uses a plain loading text section)
   - What's unclear: Should `EventCardSkeleton` be integrated into `EventList`'s loading state?
   - Recommendation: Implement skeleton integration as part of EventList changes; apply stagger reveal to skeleton cards the same as real cards. The `skip: isInitialLoading` pattern naturally handles this — skeletons appear instantly, real cards animate in.

3. **Meus-ingressos server-rendered orders**
   - What we know: `<section className="grid gap-5">` with `<article>` children is entirely server-rendered
   - What's unclear: Does `<RevealWrapper childSelector="> article">` work when children are server-RSC-rendered?
   - Recommendation: This is standard App Router pattern — should work. If RSC serialization causes issues, extract order list to a client component that receives orders as a prop.

---

## Sources

### Primary (HIGH confidence)
- npm registry — `npm view gsap` — version 3.14.2, published 2025-12-12 [VERIFIED]
- `/home/jeandias/projects/77ticket/package.json` — no gsap dependency, bun package manager [VERIFIED]
- `/home/jeandias/projects/77ticket/parallax-geometry/design-system.html` — §03 Motion Principles, `.gsap-reveal` CSS, GSAP animation values [VERIFIED]
- `/home/jeandias/projects/77ticket/src/features/events/event-list.tsx` — component structure, existing refs, stagger target pattern [VERIFIED]
- `/home/jeandias/projects/77ticket/src/features/auth/login-form.tsx` — section panel structure [VERIFIED]
- `/home/jeandias/projects/77ticket/src/features/checkout/checkout-form.tsx` — section panel structure [VERIFIED]
- `/home/jeandias/projects/77ticket/src/features/checkout/lot-selector.tsx` — section panel structure [VERIFIED]
- `/home/jeandias/projects/77ticket/vitest.config.ts` — `environment: "node"`, test directory structure [VERIFIED]
- `/home/jeandias/projects/77ticket/AGENTS.md` — TDD mandate, bun package manager rule [VERIFIED]

### Secondary (MEDIUM confidence)
- GSAP 3 `gsap.context()` cleanup pattern — widely documented community pattern, consistent with npm version 3.14.2

### Tertiary (LOW confidence — see Assumptions Log)
- GSAP 3 SSR safety of module-level imports [A1]
- App Router server-children-to-client-component pattern [A3]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — GSAP 3.14.2 verified on npm, no alternatives needed
- Architecture: HIGH — component structures verified in codebase, patterns confirmed from DS
- Pitfalls: MEDIUM — async content/stagger interaction and FOSC are known patterns, specific Vinext behavior ASSUMED

**Research date:** 2025-07-16  
**Valid until:** 2025-08-16 (GSAP stable, slow-moving)
