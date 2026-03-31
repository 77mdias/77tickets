# AGENTS.md — `src/server/repositories`

Repositories isolate persistence from business logic.

## Responsibilities

- Define business-relevant persistence contracts.
- Implement persistence adapters (e.g., Drizzle) behind contracts.
- Map low-level persistence failures to repository/app error types.

## Rules

- Hide query/ORM details from use-cases.
- Do not place business workflow logic in repository implementations.
- Keep repository interfaces explicit, small, and task-oriented.
- Avoid user-facing messaging in repository error paths.
