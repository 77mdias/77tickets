# AGENTS.md — `src/server`

Server-side code must preserve layered architecture and portability to NestJS.

## Scope

Applies to everything under `src/server`.

Primary server flow:

`api -> application/use-cases -> repositories -> infrastructure`

## Hard Boundaries

- `api` is adapter/boundary only (no business logic, no direct DB access).
- `application` orchestrates business flows and policies.
- `domain` holds entities, types, rules, and invariants.
- `repositories` expose persistence contracts and implementations.
- `infrastructure` contains replaceable adapters (db/auth/providers/observability).

## Portability Rules

- Keep domain/application framework-agnostic.
- Avoid coupling business logic to Vinext runtime APIs.
- Favor explicit contracts and deterministic use-case behavior.

## Security and Data Trust

Never trust client-originated sensitive values in use-cases/handlers.
Always derive server-side pricing, stock, ownership, role scope, and ticket validity.
