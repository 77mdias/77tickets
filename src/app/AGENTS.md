# AGENTS.md — `src/app`

App/UI layer is presentation and interaction only.

## Responsibilities

- Render pages and route-level UI.
- Handle visual states and user interactions.
- Invoke API/server functions through supported boundaries.

## Forbidden

- No direct database access.
- No business-rule enforcement in UI.
- No trusted client-side calculation for pricing/totals/stock/ticket validity.

## Required

- Keep server/client boundary clear.
- Preserve accessibility and usable fallback states.
- Prefer minimal client state; avoid unnecessary global state duplication.
