---
phase: gsap-scroll-reveal
plan: "05"
subsystem: animations
tags: [gsap, scroll-reveal, meus-ingressos, tickets, stagger, reveal-wrapper]
dependency_graph:
  requires:
    - gsap-scroll-reveal-01 (RevealWrapper + useScrollReveal hook)
  provides:
    - Meus Ingressos page header scroll-reveal
    - Order article stagger-reveal (childSelector "> article")
    - Empty state section scroll-reveal
  affects:
    - src/app/meus-ingressos/page.tsx
tech_stack:
  added: []
  patterns:
    - RevealWrapper as="header" for single-unit page header reveal
    - RevealWrapper as="section" childSelector="> article" for order list stagger
    - Server component passes children to RevealWrapper client boundary
key_files:
  created: []
  modified:
    - src/app/meus-ingressos/page.tsx
decisions:
  - "No skip needed — orders are server-rendered at page load, articles are in DOM at mount"
  - "childSelector='> article' stagger targets direct article children of the orders section"
  - "Empty state wrapped independently — only one branch renders at a time, both animate"
metrics:
  duration: "~1.5 minutes"
  tasks_completed: 1
  files_created: 0
  files_modified: 1
  completed_date: "2026-04-08T20:23:15Z"
---

# Phase gsap-scroll-reveal Plan 05: Meus Ingressos Scroll-Reveal Summary

**One-liner:** Applied RevealWrapper to Meus Ingressos page — header single-unit reveal + order article cards stagger (0.1s) + empty state reveal.

## What Was Built

Modified `src/app/meus-ingressos/page.tsx` (server component) to wrap three sections in `RevealWrapper`:

| Element | Wrapper | Mode |
|---|---|---|
| Page `<header>` (h1 + subtitle + "Ver eventos" link) | `<RevealWrapper as="header" className="mb-6 ...">` | Single-unit reveal |
| Empty state `<section>` (dashed border panel) | `<RevealWrapper as="section" className="rounded-xl ...">` | Single-unit reveal |
| Order list `<section>` | `<RevealWrapper as="section" className="grid gap-5" childSelector="> article">` | Stagger reveal (0.1s per article) |

All existing content (order data, TicketQr, token/status/QR display) is preserved inside animated articles — the animation layer (RevealWrapper) wraps the structure without touching the content.

## Animation Behavior

- **Header:** Fades + slides up (opacity 0→1, y 48→0) as single unit on page load
- **Order articles:** Each `<article>` staggers in with 0.1s delay between cards as the list scrolls into view
- **Empty state:** Single panel fades + slides up if no orders exist
- **Reduced motion:** All animations skipped — elements render at natural opacity/position instantly

## No Skip Required

Since `meus-ingressos` is a server component that fetches orders at render time via `loadCustomerOrders()`, all `<article>` elements are present in the DOM at mount. The stagger fires once when the section enters the viewport — no async loading complications, no `skip` prop needed.

## Commits

| Task | Commit | Description |
|---|---|---|
| Task 1 | `3dee0bf` | Apply scroll-reveal to meus-ingressos page |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all order data, ticket tokens, and QR codes are wired from real server-fetched data.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. RevealWrapper only applies CSS `opacity`/`transform` inline styles to existing DOM elements — ticket data (tokens, QR codes) is untouched by the animation layer (T-anim-11 accepted as designed).

## Self-Check: PASSED
