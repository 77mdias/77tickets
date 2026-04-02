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

3. **[2026-04-02] Vitest env is `node` — no jsdom, no @testing-library/react**
   Do instead: extract testable logic into `*-client.ts` pure functions and test those; React component rendering tests are not in scope for this project.

## Shell & Command Reliability
1. **[2026-03-26] Run lint and build to validate before committing**
   Do instead: `bun run lint && bun run build` before every commit.

2. **[2026-04-02] Vitest uses `--dir` not `--testPathPattern` for path filtering**
   Do instead: `vitest run --config vitest.config.ts --dir tests/unit/features/X` to narrow test runs.

3. **[2026-04-02] jsQR needs ≥~100px image — raw 21x21 QR module matrix is too small**
   Do instead: scale up module matrix 10x with 4-module quiet zone, convert to RGBA Uint8ClampedArray before feeding to jsQR.

## Domain Behavior Guardrails
1. **[2026-03-26] Pricing, stock validation, ticket generation must always be server-side**
   Do instead: never trust client-provided totals, quantities, or statuses — always recompute server-side.

2. **[2026-04-02] QR scanner captures only — validation stays in use-case**
   Do instead: `QrScanner` calls `onScan(code)` and stops; `ValidateCheckin` use-case handles all business rules.

## User Directives
1. **[2026-03-26] Stack: Vinext + Cloudflare Workers + Neon PostgreSQL + Drizzle ORM + Zod + Tailwind + shadcn/ui**
   Do instead: always use this stack, never introduce incompatible dependencies.

2. **[2026-03-26] Code must remain portable to Next.js + NestJS migration**
   Do instead: keep domain/application/repository layers framework-agnostic.

3. **[2026-04-02] Sprint 018 (NestJS migration) is now unblocked — MIGRATION-GATE.md approved**
   Do instead: before starting Sprint 018, read `docs/development/MIGRATION-GATE.md` and `MIGRATION-PLAN.md` section 9.
