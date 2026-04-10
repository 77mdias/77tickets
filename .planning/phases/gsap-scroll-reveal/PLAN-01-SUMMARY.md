---
phase: gsap-scroll-reveal
plan: "01"
subsystem: animations
tags: [gsap, scroll-reveal, animation, hooks, client-components]
dependency_graph:
  requires: []
  provides:
    - gsap ScrollTrigger singleton (src/lib/gsap-init.ts)
    - useScrollReveal hook (src/hooks/use-scroll-reveal.ts)
    - RevealWrapper client component (src/components/reveal-wrapper.tsx)
    - .gsap-reveal CSS class (src/app/globals.css)
  affects:
    - All Wave 1 plans that add scroll-reveal to pages
tech_stack:
  added:
    - gsap@3.14.2 (free tier — ScrollTrigger included)
  patterns:
    - gsap.context() for scoped cleanup
    - [skip] dep array pattern for async-loaded DOM
    - prefers-reduced-motion guard in hook
key_files:
  created:
    - src/lib/gsap-init.ts
    - src/hooks/use-scroll-reveal.ts
    - src/components/reveal-wrapper.tsx
  modified:
    - src/app/globals.css
decisions:
  - "[skip] dep array (not []) — hook re-fires when async data loads and DOM is ready"
  - "gsap.context(fn, el) scoped cleanup via ctx.revert() on unmount (T-anim-02 mitigation)"
  - "once: true on ScrollTrigger prevents re-firing on scroll-back"
  - "prefers-reduced-motion guard returns early — no GSAP registered, no inline styles set"
  - ".gsap-reveal CSS class is belt-and-suspenders; hook uses gsap.set() directly at runtime"
metrics:
  duration: "~2.5 minutes"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
  completed_date: "2026-04-08T20:09:15Z"
---

# Phase gsap-scroll-reveal Plan 01: GSAP Foundation Layer Summary

**One-liner:** GSAP 3.14.2 scroll-reveal foundation with ScrollTrigger singleton, skip-aware hook, RSC-compatible RevealWrapper, and prefers-reduced-motion CSS safety net.

## What Was Built

Installed GSAP 3.14.2 and created the animation foundation layer that all Wave 1 plans depend on:

| Artifact | Export | Purpose |
|---|---|---|
| `src/lib/gsap-init.ts` | `registerGsap()` | Singleton ScrollTrigger registration — safe for SSR (never runs at module scope) |
| `src/hooks/use-scroll-reveal.ts` | `useScrollReveal`, `ScrollRevealOptions` | Core animation hook with skip/stagger/reduced-motion support |
| `src/components/reveal-wrapper.tsx` | `RevealWrapper` | "use client" thin wrapper for use in RSC pages |
| `src/app/globals.css` | `.gsap-reveal` | CSS initial hidden state + reduced-motion override |

## Animation Defaults (from DS §03)

```
opacity:  0 → 1
y:        48 → 0 (px)
duration: 0.9s
ease:     "power3.out"
stagger:  0.1s (for list/grid children)
trigger:  "top 85%"
```

## Key Technical Decisions

### [skip] Dependency Array Pattern
The hook uses `[skip]` as its dependency array (not `[]`). This enables async-loaded pages:
- `skip: isInitialLoading` → hook no-ops while data fetches
- When `skip` flips `false`, effect re-fires and finds DOM elements ready for animation
- For callers that never use `skip`, behavior is identical to `[]` (fires once on mount)

### gsap.context() Scoped Cleanup
All tweens and ScrollTriggers are created inside `gsap.context(fn, el)`, scoped to the target element. `ctx.revert()` in the cleanup function kills everything on unmount — no memory leaks (T-anim-02 threat mitigated).

### Two Usage Modes
1. **Single element:** `useScrollReveal(ref)` — animates the element itself
2. **Container + children:** `useScrollReveal(ref, { childSelector: "> article", stagger: 0.1 })` — stagger-animates matching children

## Commits

| Task | Commit | Description |
|---|---|---|
| Task 1 | `2601388` | gsap install + gsap-init.ts + use-scroll-reveal.ts |
| Task 2 | `5786ee0` | reveal-wrapper.tsx + .gsap-reveal CSS |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this is a pure infrastructure plan. No UI data rendering.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Animation code runs entirely in the browser (client bundle). As noted in the plan's threat model:
- T-anim-01: GSAP only writes `opacity`/`transform` inline styles — no injection vector
- T-anim-02: **Mitigated** — `ctx.revert()` cleanup implemented as required
- T-anim-03: Accepted — no secrets in animation code

## Self-Check: PASSED

