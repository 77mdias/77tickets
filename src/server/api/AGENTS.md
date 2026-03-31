# AGENTS.md — `src/server/api`

API layer is a thin boundary adapter.

## Responsibilities

- Parse request input.
- Validate all external input with Zod schemas.
- Resolve auth/session/actor context when required.
- Call use-cases with typed input.
- Map domain/app errors to stable response shapes.

## Forbidden

- No business rules in handlers/route adapters.
- No direct repository/DB/infrastructure access from handlers.
- No ad hoc authorization logic scattered across files.
- No leaking raw internal errors to client responses.

## Required

- Keep handlers focused and small.
- Keep response contracts explicit and stable.
- Keep RBAC checks server-side and auditable.
