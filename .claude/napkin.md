# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-03-26] TDD is mandatory — no production code without a failing test first**
   Do instead: write test → verify red → implement minimal → verify green → refactor.

2. **[2026-03-26] Architecture boundary: UI must never touch DB directly**
   Do instead: always route through handler → use-case → repository → infrastructure.

## Shell & Command Reliability
1. **[2026-03-26] Run lint and build to validate before committing**
   Do instead: `npm run lint && npm run build` before every commit.

## Domain Behavior Guardrails
1. **[2026-03-26] Pricing, stock validation, ticket generation must always be server-side**
   Do instead: never trust client-provided totals, quantities, or statuses — always recompute server-side.

## User Directives
1. **[2026-03-26] Stack: Vinext + Cloudflare Workers + Neon PostgreSQL + Drizzle ORM + Zod + Tailwind + shadcn/ui**
   Do instead: always use this stack, never introduce incompatible dependencies.

2. **[2026-03-26] Code must remain portable to Next.js + NestJS migration**
   Do instead: keep domain/application/repository layers framework-agnostic.
