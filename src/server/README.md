# Server Layered Architecture

This directory contains the backend layers used by the TicketFlow demo.

Flow:

`UI -> handler -> use-case -> repository -> database`

Layer responsibilities:

- `api`: thin request/response adapters and input validation boundaries.
- `application`: use-cases and orchestration of business flows.
- `domain`: entities, value objects, enums, and invariants.
- `repositories`: persistence contracts and implementations.
- `infrastructure`: external adapters (database, auth, providers).

Rules:

- UI must not contain business rules.
- Handlers must not contain business rules or direct DB calls.
- Use-cases must be framework-agnostic and portable to NestJS later.
- Repositories isolate persistence details from business logic.
