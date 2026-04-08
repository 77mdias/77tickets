---
phase: gsap-scroll-reveal
plan: "04"
subsystem: animation
tags: [gsap, scroll-reveal, forms, client-components]
dependency_graph:
  requires: [gsap-scroll-reveal-01]
  provides: [form-panel-scroll-reveal]
  affects: [src/features/auth/login-form.tsx, src/features/checkout/checkout-form.tsx, src/features/checkout/lot-selector.tsx]
tech_stack:
  added: []
  patterns: [useScrollReveal hook pattern, React hooks rules (unconditional hook calls)]
key_files:
  created: []
  modified:
    - src/features/auth/login-form.tsx
    - src/features/checkout/checkout-form.tsx
    - src/features/checkout/lot-selector.tsx
decisions:
  - "Single sectionRef used for LotSelector both render paths (early return + main return) — ref attaches to whichever section mounts"
  - "Hook calls placed before early return in LotSelector to satisfy React hooks rules"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-08T20:20:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase gsap-scroll-reveal Plan 04: Form Panel Scroll-Reveal Summary

**One-liner:** Applied `useScrollReveal(sectionRef)` to three form panel components (LoginForm, CheckoutForm, LotSelector) for opacity 0→1 + y 48→0 entrance animation on load.

## What Was Built

Added scroll-reveal entrance animation to the three primary form panels in the application:

1. **LoginForm** (`src/features/auth/login-form.tsx`) — The auth panel at `/login` now fades/slides in on page load using `useScrollReveal`.

2. **CheckoutForm** (`src/features/checkout/checkout-form.tsx`) — The checkout panel at `/checkout` reveals with the same animation values.

3. **LotSelector** (`src/features/checkout/lot-selector.tsx`) — The lot selection panel at `/eventos/[slug]` reveals independently. Hook declared before the `availableLots.length === 0` early return guard, ref attached to both render paths.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add useScrollReveal to LoginForm and CheckoutForm | 69a3406 | login-form.tsx, checkout-form.tsx |
| 2 | Add useScrollReveal to LotSelector | 69a3406 | lot-selector.tsx |

## Verification

- `grep` confirmed: each file has import, ref declaration, hook call, and `ref={sectionRef}` on outer `<section>`
- LotSelector: `useRef` + `useScrollReveal` at lines 31–32, before early return at line 40
- `bun run build` exits 0 — no TypeScript errors

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all three panels wire directly to the `useScrollReveal` hook with no placeholder data.

## Threat Flags

No new threat surface introduced. Animation layer only writes `opacity` and `transform` CSS properties via GSAP. Form state, submission, and validation logic are entirely unchanged.
