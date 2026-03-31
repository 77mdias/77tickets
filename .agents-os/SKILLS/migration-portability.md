# Skill: Migration Portability Check (Vinext -> Next.js + NestJS)

Use before finalizing changes that touch server/domain boundaries.

## Checklist

- Domain/application code has no Vinext runtime dependency.
- HTTP-specific details remain in route adapters/handlers only.
- Persistence access remains behind repository contracts.
- Validation schemas are boundary-level and reusable.
- Business rules remain in domain/application, not UI.

## Risk Flags

- Direct framework objects in use-cases.
- DB/ORM calls from handlers or UI.
- Hidden side effects that prevent controller extraction to NestJS.
