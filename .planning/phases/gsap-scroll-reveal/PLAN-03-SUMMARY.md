---
phase: gsap-scroll-reveal
plan: "03"
subsystem: animations
tags: [gsap, scroll-reveal, event-detail, server-component, rsc]
dependency_graph:
  requires: [gsap-scroll-reveal-01]
  provides: [event-detail-reveal-animations]
  affects: [src/app/eventos/[slug]/page.tsx]
tech_stack:
  added: []
  patterns: [RevealWrapper RSC composition, server-children-in-client-wrapper]
key_files:
  created: []
  modified:
    - src/app/eventos/[slug]/page.tsx
decisions:
  - "Hero section and lots section each wrapped in independent RevealWrapper as=section"
  - "LotSelector left unwrapped — its internal animation deferred to PLAN-04 to avoid double-animation"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-08T20:16:48Z"
  tasks_completed: 1
  files_modified: 1
---

# Phase gsap-scroll-reveal Plan 03: Event Detail Scroll-Reveal Summary

## One-liner
Applied GSAP scroll-reveal to event detail page via two independent RevealWrapper sections (hero + lots), using RSC composition pattern with server children passed through client wrapper.

## What Was Built

Modified `src/app/eventos/[slug]/page.tsx` (a Next.js Server Component) to wrap two content sections in `RevealWrapper` client components:

1. **Hero section** — `<RevealWrapper as="section" className="overflow-hidden rounded-xl border border-white/10 bg-white/5">` wrapping: event image/placeholder, h1 title, description paragraph, and date/location metadata grid.

2. **Lots section** — `<RevealWrapper as="section" className="rounded-xl border border-white/10 bg-white/5 p-5">` wrapping: the "Lotes" h2 heading and the ul of lot rows.

3. **LotSelector** — left unwrapped. Its own scroll-reveal animation will be added internally in PLAN-04 to avoid double-animation.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `as="section"` for both wrappers | Preserves semantic HTML — RevealWrapper renders as `<section>` instead of default `<div>`, maintaining document structure |
| LotSelector NOT wrapped | PLAN-04 adds `useScrollReveal` inside the `LotSelector` component directly. Wrapping externally AND internally would double-animate the element |
| No changes to types/helpers | `EventDetailPayload`, `formatDateTime`, `formatCurrency`, `loadEventDetail` all unchanged — pure structural wrapping |

## Animations Applied

| Section | Element | Animation |
|---------|---------|-----------|
| Hero | `<section>` with image + title + meta | opacity 0→1, y 48→0, 0.9s, power3.out |
| Lots | `<section>` with h2 + lot row list | opacity 0→1, y 48→0, 0.9s, power3.out |
| LotSelector | (deferred to PLAN-04) | — |

Reduced motion: both sections appear instantly when `prefers-reduced-motion: reduce` is set (handled by `useScrollReveal` hook guard).

## Commits

| Hash | Message |
|------|---------|
| 3e04f5d | feat(gsap-scroll-reveal-03): wrap event detail hero and lots sections in RevealWrapper |

## Deviations from Plan

None — plan executed exactly as written. The plan's own "Revised" note already clarified that LotSelector should NOT be wrapped here; that instruction was followed.

## Known Stubs

None. All children render real server-fetched data (`data.event.*`, `data.lots.*`).

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. RevealWrapper adds client-side animation only; server-rendered children are unchanged RSC payload.

## Self-Check: PASSED

- ✅ `src/app/eventos/[slug]/page.tsx` exists and modified
- ✅ `.planning/phases/gsap-scroll-reveal/PLAN-03-SUMMARY.md` created
- ✅ Commit `3e04f5d` exists in git history
