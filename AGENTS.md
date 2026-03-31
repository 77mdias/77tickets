# AGENTS.md — TicketFlow (Global Rules)

This file defines durable repository-wide rules for AI agents.

Detailed, directory-specific rules belong in local `AGENTS.md` files.
Reusable execution workflows belong in repo skills.

## 1) Authority and Precedence

When rules conflict, use this order:

1. Direct user instruction
2. Root `AGENTS.md` (this file)
3. Local `AGENTS.md` (closest directory scope)
4. Repo skills (`.agents-os/SKILLS/*`)
5. Superpowers/process helpers

Superpowers is a helper workflow layer. It is not the authority over repository rules.

## 2) Product Direction (Durable)

TicketFlow is a ticketing platform demo built with production-oriented boundaries.

Current direction:
- Runtime: Vinext full-stack demo
- Deployment target (demo): Cloudflare Workers
- Database: Neon PostgreSQL
- ORM: Drizzle ORM
- Validation: Zod
- UI: Tailwind CSS + shadcn/ui

Future migration target:
- Frontend: Next.js
- Backend: NestJS

All work must preserve easy migration with minimal rewrite of domain/application logic.

## 3) Non-Negotiable Architecture

Primary flow:

`UI -> handler/route adapter -> use-case -> repository -> database`

Rules:
- UI must not contain business rules.
- Handlers/routes must remain thin.
- Application/use-cases contain orchestration and business flow.
- Persistence access happens via repositories.
- Infrastructure concerns must not leak into domain/application.
- Domain and application code must stay framework-agnostic and portable.

Any implementation that breaks boundaries or increases framework coupling without strong justification is invalid.

## 4) Security and Trust Model

Never trust client-provided sensitive data. Always derive server-side:
- pricing and totals
- event ownership/authorization scope
- ticket status
- role permissions

RBAC roles used by the platform:
- `customer`
- `organizer`
- `admin`
- `checker`

AuthN/AuthZ must be enforced server-side at handler/service boundaries.

## 5) Validation and Error Boundaries

- All external input must be validated with Zod at boundaries.
- External input includes body, params, query, form input, webhook payloads, and URL-derived values.
- Handlers must return stable, structured error shapes.
- Do not leak raw database/internal errors to clients.

## 6) Durable Ticketing Domain Rules

Preserve these invariants:
- Unpublished/cancelled events are not publicly purchasable.
- Lots respect sale windows, per-order limits, and cannot oversell.
- Order totals are computed server-side with explicit status transitions.
- Expired unpaid orders do not produce valid active tickets.
- Used/cancelled tickets are invalid; check-in blocks duplicate usage.
- Check-in validates ticket/event context.
- Coupons respect validity windows, usage limits, and applicability rules.

## 7) Testing and Delivery Rules

TDD is mandatory for:
- new features
- bug fixes
- behavior changes

Minimum rule: no production behavior change without a failing test first, then green.

A task is only complete when:
- acceptance criteria are met
- relevant tests pass
- architectural boundaries remain intact
- no unjustified coupling/regression is introduced

## 8) Where Detailed Guidance Lives

Use local AGENTS for scoped conventions:
- `src/app/AGENTS.md`
- `src/server/AGENTS.md`
- `src/server/api/AGENTS.md`
- `src/server/application/AGENTS.md`
- `src/server/repositories/AGENTS.md`
- `tests/AGENTS.md`

Use repo skills for reusable workflows:
- `.agents-os/SKILLS/feature-delivery.md`
- `.agents-os/SKILLS/tdd-cycle.md`
- `.agents-os/SKILLS/migration-portability.md`

Use subagents only when isolation or parallelization clearly improves quality/speed.
