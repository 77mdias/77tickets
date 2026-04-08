---
phase: gsap-scroll-reveal
plan: "02"
subsystem: animations
tags: [gsap, scroll-reveal, home-page, event-list, stagger, client-components]
dependency_graph:
  requires:
    - gsap ScrollTrigger singleton (src/lib/gsap-init.ts) — from PLAN-01
    - useScrollReveal hook (src/hooks/use-scroll-reveal.ts) — from PLAN-01
    - RevealWrapper client component (src/components/reveal-wrapper.tsx) — from PLAN-01
  provides:
    - Home page header scroll-reveal animation (src/app/page.tsx)
    - Event card grid stagger-reveal animation (src/features/events/event-list.tsx)
  affects:
    - Home page (/) visual entrance animation
    - Event discovery UX (cards appear with stagger after data loads)
tech_stack:
  added: []
  patterns:
    - RevealWrapper as-prop for RSC server component pages
    - skip: isInitialLoading pattern for async-loaded DOM grids
    - useRef<HTMLDivElement>(null) + useScrollReveal for client component grids
key_files:
  created: []
  modified:
    - src/app/page.tsx
    - src/features/events/event-list.tsx
decisions:
  - "RevealWrapper as='header' preserves semantic HTML element; className passed through"
  - "skip: isInitialLoading prevents empty-grid ScrollTrigger registration; re-fires when DOM ready"
  - "gridRef placed alongside requestIdRef — separate concerns (animation vs. request deduplication)"
  - "Load More path unaffected — isInitialLoading stays false after first load; new cards appear instantly"
metrics:
  duration: "~1.5 minutes"
  tasks_completed: 2
  files_created: 0
  files_modified: 2
  completed_date: "2026-04-08T20:12:49Z"
---

# Phase gsap-scroll-reveal Plan 02: Apply Scroll-Reveal to Home Page and EventList Summary

**One-liner:** Home page header wrapped in RevealWrapper (single-unit entrance animation) and EventList card grid wired with stagger-reveal using skip:isInitialLoading pattern to handle async data loading.

## What Was Built

Applied the PLAN-01 animation infrastructure to two UI surfaces on the home page:

| Surface | File | Change | Animation |
|---------|------|--------|-----------|
| Home `<header>` | `src/app/page.tsx` | `<header>` → `<RevealWrapper as="header">` | Single-element: opacity 0→1, y 48→0, 0.9s |
| Event card grid | `src/features/events/event-list.tsx` | Added `gridRef` + `useScrollReveal` + `ref={gridRef}` | Stagger: each `<article>` staggers 0.1s after previous |

### Task 1: Home page header

In `src/app/page.tsx` (server component), imported `RevealWrapper` and replaced the raw `<header>` element with `<RevealWrapper as="header" className="...">`. All children preserved — `<h1>`, `<p>`, both `<Link>` nav buttons. The `as="header"` prop ensures the rendered HTML element is still a semantic `<header>` tag.

### Task 2: EventList stagger-reveal

In `src/features/events/event-list.tsx` (already `"use client"`):
1. Added `import { useScrollReveal } from "@/hooks/use-scroll-reveal"`
2. Added `const gridRef = useRef<HTMLDivElement>(null)` after `requestIdRef`
3. Called `useScrollReveal(gridRef, { childSelector: "> article", skip: isInitialLoading })`
4. Added `ref={gridRef}` to the grid `<div className="grid gap-4 ...">` 

The `skip: isInitialLoading` pattern is critical here: on mount `isInitialLoading === true`, so the hook returns early. After the API fetch completes, React sets `isInitialLoading = false`, re-renders with article elements in the DOM, and the `[skip]` dep array triggers the effect to re-run — at which point GSAP correctly targets all `> article` children.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `706ad29` | wrap home header in RevealWrapper |
| Task 2 | `0e1c375` | stagger-reveal event card grid in EventList |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no placeholder or hardcoded empty data introduced.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Animation code runs entirely in the browser. Threat model items accepted as-is:
- T-anim-04: `"> article"` selector is hardcoded — no injection risk
- T-anim-05: GSAP only writes `opacity`/`transform` inline styles — no href/src manipulation

## Self-Check: PASSED
