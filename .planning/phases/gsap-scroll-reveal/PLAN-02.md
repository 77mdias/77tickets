---
phase: gsap-scroll-reveal
plan: 02
type: execute
wave: 1
depends_on: [gsap-scroll-reveal-01]
files_modified:
  - src/app/page.tsx
  - src/features/events/event-list.tsx
autonomous: true
requirements:
  - ANIM-04

must_haves:
  truths:
    - "Home page header (h1 + subtitle + nav links) fades/slides in on load"
    - "Event card grid items stagger-reveal as user scrolls"
    - "Both animations are skipped when prefers-reduced-motion is enabled"
  artifacts:
    - path: "src/app/page.tsx"
      provides: "Home page with RevealWrapper on header"
      contains: "RevealWrapper"
    - path: "src/features/events/event-list.tsx"
      provides: "EventList with stagger reveal on card grid"
      contains: "useScrollReveal"
  key_links:
    - from: "src/app/page.tsx"
      to: "src/components/reveal-wrapper.tsx"
      via: "<RevealWrapper as=\"header\">"
      pattern: "RevealWrapper"
    - from: "src/features/events/event-list.tsx"
      to: "src/hooks/use-scroll-reveal.ts"
      via: "useScrollReveal(gridRef, { childSelector: '> article', skip: isInitialLoading })"
      pattern: "useScrollReveal"
---

<objective>
Apply scroll-reveal animations to the home page (`/`):
1. The page `<header>` (h1, subtitle, nav links) reveals as a single unit on load.
2. The event card grid in `EventList` staggers each `<article>` card with 0.1s gaps.

Purpose: The home page is the primary discovery surface — animated entry adds polish without
compromising usability.
Output: Two modified files. No new files.
</objective>

<execution_context>
@~/.copilot/get-shit-done/workflows/execute-plan.md
@~/.copilot/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/gsap-scroll-reveal/CONTEXT.md
@src/app/page.tsx
@src/features/events/event-list.tsx

<interfaces>
<!-- From PLAN-01 artifacts — use these directly, no codebase exploration needed -->

From src/components/reveal-wrapper.tsx:
```typescript
interface RevealWrapperProps extends ScrollRevealOptions {
  children: ReactNode;
  as?: ElementType;       // default: "div"
  className?: string;
  // ScrollRevealOptions: childSelector?, stagger?, y?, duration?, ease?, start?
}
export function RevealWrapper(props: RevealWrapperProps): JSX.Element
```

From src/hooks/use-scroll-reveal.ts:
```typescript
export interface ScrollRevealOptions {
  childSelector?: string;  // CSS selector for stagger mode (e.g. "> article")
  stagger?: number;        // default: 0.1
  y?: number;              // default: 48
  duration?: number;       // default: 0.9
  ease?: string;           // default: "power3.out"
  start?: string;          // default: "top 85%"
  skip?: boolean;          // when true, hook is a no-op; re-runs when flips to false
}
export function useScrollReveal<T extends Element>(
  ref: RefObject<T | null>,
  options?: ScrollRevealOptions
): void
```

**Open questions resolved (from RESEARCH.md):**

- **Q1 (`skip` dep timing):** Resolved. Hook uses `[skip]` dep array. When `isInitialLoading`
  flips to `false`, React commits the updated DOM (articles rendered), then runs the effect.
  So `ref.current.querySelectorAll("> article")` correctly finds all article elements.
  No `ScrollTrigger.refresh()` needed.

- **Q2 (EventCardSkeleton):** Resolved. `EventList` renders a separate skeleton list fallback
  (`isInitialLoading === true` branch); the grid with real `<article>` cards only appears
  after data loads. `skip: isInitialLoading` means: skeletons are never targeted by the hook;
  real cards animate in after `isInitialLoading → false`. No skeleton-animation integration needed.

- **Q3 (RevealWrapper RSC children):** Resolved. Standard App Router pattern — server-rendered
  children are serialized as React elements and passed through the client component boundary
  as the `children` prop. `RevealWrapper` renders them unchanged inside a `<div>` (or `as=` tag).
  Works correctly; no client component extraction needed.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wrap home page header in RevealWrapper</name>
  <files>src/app/page.tsx</files>
  <action>
In `src/app/page.tsx`, import `RevealWrapper` and replace the raw `<header>` with
`<RevealWrapper as="header">`, preserving all existing className and children.

Change:
```tsx
// BEFORE
import Link from "next/link";
import { EventSearch } from "@/features/events/event-search";

export default async function Home() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-950 px-6 py-10">
      <main className="flex w-full max-w-6xl flex-col">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          ...
        </header>
        <EventSearch />
      </main>
    </div>
  );
}
```

To:
```tsx
// AFTER
import Link from "next/link";
import { EventSearch } from "@/features/events/event-search";
import { RevealWrapper } from "@/components/reveal-wrapper";

export default async function Home() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-950 px-6 py-10">
      <main className="flex w-full max-w-6xl flex-col">
        <RevealWrapper
          as="header"
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-semibold text-white">Eventos Abertos</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Explore eventos publicados e inicie sua compra em poucos passos.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              className="rounded-md border border-white/20 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-white/40 hover:text-white"
              href="/login"
            >
              Login
            </Link>
            <Link
              className="rounded-md bg-white px-3 py-2 text-sm font-medium text-zinc-950 transition-opacity hover:opacity-90"
              href="/meus-ingressos"
            >
              Meus Ingressos
            </Link>
          </div>
        </RevealWrapper>
        <EventSearch />
      </main>
    </div>
  );
}
```

The `RevealWrapper` renders as a `<header>` HTML element (via `as="header"`), so the semantic
structure is unchanged. Default animation values apply: opacity 0→1, y 48→0, 0.9s, power3.out,
trigger "top 85%".

Since the header is near the top of the viewport on initial load, the ScrollTrigger fires
immediately on page load (start "top 85%" is already in view). This is intentional — it creates
the entrance animation on first render.
  </action>
  <verify>
    <automated>cd /home/jeandias/projects/77ticket && bun run build 2>&1 | tail -10</automated>
  </verify>
  <done>
    - src/app/page.tsx imports RevealWrapper
    - `<header>` is replaced with `<RevealWrapper as="header" className="...">`
    - All original children (h1, p, Links) are preserved inside the wrapper
    - Build passes with no TypeScript errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Stagger-reveal event card grid in EventList</name>
  <files>src/features/events/event-list.tsx</files>
  <action>
In `src/features/events/event-list.tsx`, add `useScrollReveal` with `childSelector: "> article"`
and `skip: isInitialLoading` to the event grid `<div>`.

**Why `skip: isInitialLoading`:** On mount, `isInitialLoading` is `true` — the grid is empty
(data not yet fetched). Without `skip`, the hook would run immediately and find zero `<article>`
elements, registering a ScrollTrigger on an empty container that never fires. With
`skip: isInitialLoading`, the hook returns early on mount. When the fetch completes and React
sets `isInitialLoading = false`, the effect re-runs (dep array is `[skip]`), the articles are
now in the DOM, and GSAP targets them correctly.

`isInitialLoading` already exists as a `useState` on line 111 — no new state needed.

Changes required:

1. Add `useScrollReveal` import (hook is in `src/hooks/use-scroll-reveal.ts`).
2. Add a `gridRef` using `useRef<HTMLDivElement>(null)` in the `EventList` component body.
   The component already uses `useRef` (line 108, `requestIdRef`), so add `gridRef` alongside it.
3. Call `useScrollReveal(gridRef, { childSelector: "> article", skip: isInitialLoading })` in the component body.
4. Attach `ref={gridRef}` to the `<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">`.

The hook will:
- Return early while `isInitialLoading === true` (no GSAP setup, no empty-container ScrollTrigger)
- When `isInitialLoading` flips to `false`: React commits DOM with articles, then the effect re-runs,
  sets `opacity: 0, y: 48` on all `> article` children, and creates a ScrollTrigger on the grid
- On scroll-enter: animate all articles to `opacity: 1, y: 0` with 0.1s stagger between each

Important implementation notes:
- `gridRef` is separate from `requestIdRef` — they serve different purposes
- "Load More" button appends to `events` array but does NOT reset `isInitialLoading` → new items
  from "Load More" appear instantly (no re-animation). This is acceptable per scope.
- Only apply `useScrollReveal` to the main grid div (the one with `grid gap-4 ...` classes),
  NOT to the empty-state or error-state sections

Exact diff to the `EventList` function:

```tsx
// Add to existing imports:
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

// Inside EventList component, after requestIdRef:
const gridRef = useRef<HTMLDivElement>(null);
useScrollReveal(gridRef, { childSelector: "> article", skip: isInitialLoading });

// On the grid div (currently line ~244):
// BEFORE:
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

// AFTER:
<div ref={gridRef} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
```

Do NOT change the import line for `useRef` — it is already imported from React.
Just add `useScrollReveal` import and `gridRef` declaration + hook call + `ref` prop.
  </action>
  <verify>
    <automated>cd /home/jeandias/projects/77ticket && bun run build 2>&1 | tail -10</automated>
  </verify>
  <done>
    - `useScrollReveal` is imported in event-list.tsx
    - `gridRef` is declared with `useRef<HTMLDivElement>(null)`
    - `useScrollReveal(gridRef, { childSelector: "> article", skip: isInitialLoading })` is called in component body
    - `isInitialLoading` (line 111) is passed as `skip` — no new state introduced
    - Grid `<div>` has `ref={gridRef}`
    - Build passes with no TypeScript errors
    - No changes to loading/error/empty state branches
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| GSAP→DOM | GSAP applies inline opacity/transform to event card articles |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-anim-04 | Denial of Service | childSelector querySelectorAll | accept | Selector is hardcoded `"> article"` — not user-controlled. No injection risk. |
| T-anim-05 | Tampering | opacity/transform inline styles | accept | GSAP only writes visual properties — opacity, transform. No href or src manipulation. |
</threat_model>

<verification>
1. `bun run build` exits 0
2. `grep -n "RevealWrapper" src/app/page.tsx` shows import + usage
3. `grep -n "useScrollReveal\|gridRef" src/features/events/event-list.tsx` shows hook usage
4. Manual check at `http://localhost:3000/` (run `bun run dev`):
   - Header block slides up and fades in on page load
   - Event cards stagger-reveal as page loads (trigger fires immediately since cards are in viewport)
   - In browser DevTools Rendering tab → "Emulate CSS prefers-reduced-motion: reduce" → header and cards appear instantly with no animation
</verification>

<success_criteria>
- Home page header animates in as single unit on load (opacity 0→1, y 48→0, 0.9s)
- Event card grid items stagger-reveal (0.1s gap between each card)
- prefers-reduced-motion: no animation, elements visible immediately
- Build passes with no errors
</success_criteria>

<output>
After completion, create `.planning/phases/gsap-scroll-reveal/gsap-scroll-reveal-02-SUMMARY.md`
</output>
