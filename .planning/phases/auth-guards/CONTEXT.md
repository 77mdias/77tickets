# Phase: Auth Guards via Next.js Middleware

## Problem
`/admin` and `/checkin` pages have zero authentication at the page level.
The API routes enforce RBAC, but anyone can load the UI without being authenticated.
`/meus-ingressos` also has no middleware guard (only an API-level 401 fallback).

## Decisions Locked

| Decision | Choice | Rationale |
|---|---|---|
| Mechanism | `src/middleware.ts` (centralized) | One place to update; covers all sub-routes automatically |
| `/admin` allowed roles | `admin` only | Stricter than API — organizers use per-event views |
| `/checkin` allowed roles | `admin`, `organizer`, `checker` | Matches API enforcement |
| `/meus-ingressos` allowed | any authenticated role | Any logged-in user can see their own tickets |
| Wrong role / unauthenticated | redirect to `/login?next=<pathname>` | Login page already handles `?next=` param |

## Implementation Approach

Next.js middleware runs on **Edge runtime** — Drizzle/Neon are not Edge-compatible.
Solution: middleware fetches `/api/auth/get-session` (already exposed via `toNextJsHandler`) with forwarded cookies. This is a local HTTP call, not an external roundtrip.

BetterAuth stores role on `session.user.role`.

## Files to Touch

- **CREATE** `src/middleware.ts` — main implementation
- **NO changes** to `src/app/admin/page.tsx` or `src/app/checkin/page.tsx` — middleware handles the guard before the page renders
- **NO changes** to `src/app/meus-ingressos/page.tsx` — keep API-level 401 fallback as defense-in-depth

## Matcher Config
```
matcher: ["/admin/:path*", "/checkin/:path*", "/meus-ingressos/:path*"]
```
API routes (`/api/**`) are intentionally excluded — they self-enforce RBAC.
