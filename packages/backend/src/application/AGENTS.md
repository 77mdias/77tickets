# AGENTS.md — `src/server/application`

Application layer owns business orchestration.

## Responsibilities

- Implement use-cases and application policies.
- Coordinate repository contracts.
- Enforce use-case-specific business rules.
- Keep flows deterministic when possible.

## Design Rules

- No HTTP/request/response formatting concerns.
- No framework/runtime-specific dependencies.
- No direct ORM query logic.
- Prefer explicit inputs/outputs and error categories.

## Ticketing-Specific Invariants

- Server computes totals/pricing and validates stock.
- Status transitions are explicit and validated.
- Ticket generation/validation/check-in logic remains server-side.
