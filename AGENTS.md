# AGENTS.md — TicketFlow

## 1. Overview

This repository contains a **ticketing platform demo** designed with a **production-oriented architecture**.

Current stack direction:

- **Frontend/App runtime:** Vinext
- **Deployment target (demo):** Cloudflare Workers
- **Database:** Neon PostgreSQL
- **ORM:** Drizzle ORM
- **Validation:** Zod
- **Styling/UI:** Tailwind CSS + shadcn/ui
- **Future backend target:** NestJS
- **Future frontend target (if needed):** Next.js

This project MUST be developed in a way that allows future migration from:

- `Vinext full-stack demo`
to
- `Next.js frontend + NestJS backend`

with minimal rewrite of business logic.

---

## 2. Architecture Principles

Agents MUST follow these principles strictly.

### 2.1 Separation of Concerns

- UI must NOT contain business logic.
- Route handlers / API handlers must remain thin.
- Business logic must live in the application layer.
- Database access must happen only through repositories.
- Infrastructure concerns must not leak into domain logic.

### 2.2 Framework Independence

- Domain and application code must be framework-agnostic.
- Do NOT couple business rules to Vinext-specific APIs.
- Code written today must remain portable to NestJS later.

### 2.3 Type Safety First

- Always use TypeScript.
- Always validate external input.
- Never trust client-provided data.
- Prefer explicit types over inference when clarity matters.

### 2.4 Explicitness Over Magic

- Prefer clear flows over hidden abstractions.
- Avoid unnecessary indirection.
- Avoid “smart” patterns that make future migration harder.
- Prioritize maintainability and portability.

### 2.5 Evolutionary Architecture

The codebase should support:

1. Demo stage with Vinext full-stack patterns
2. Future extraction of backend modules into NestJS
3. Continued use of PostgreSQL without schema redesign
4. Minimal rewriting of use-cases and domain rules

---

## 3. High-Level Architecture

Current intended flow:

```text
UI → Route Handler / Server Function → Use Case → Repository → Database
````

Future intended flow:

```text
UI (Next.js) → NestJS Controller → Use Case → Repository → Database
```

Therefore, use-cases and domain modules must remain reusable.

---

## 4. Project Structure

Recommended structure:

```text
src/
  app/                  # Pages, layouts, route-level UI
  components/           # Reusable presentational UI components
  features/             # Feature-based UI modules
  lib/                  # Shared utilities, helpers, constants

  server/
    api/                # Thin handlers / route adapters
    application/        # Use-cases and app services
    domain/             # Entities, value objects, business rules
    repositories/       # Contracts + implementations
    infrastructure/     # DB, auth, providers, external adapters
```

Example feature areas:

```text
features/
  auth/
  events/
  checkout/
  orders/
  tickets/
  admin/
  checkin/
```

---

## 5. Layer Responsibilities

### 5.1 UI Layer

Location:

* `src/app`
* `src/components`
* `src/features/*`

Responsibilities:

* rendering
* user interactions
* form handling
* visual states
* calling APIs/services/hooks

UI MUST NOT:

* access database directly
* implement business rules
* perform stock validation logic
* implement order status transitions
* contain authorization rules

### 5.2 API / Handler Layer

Location:

* `src/server/api`

Responsibilities:

* parse request
* validate input with Zod
* call use-cases
* serialize output
* map domain/application errors to response format

Handlers MUST NOT:

* directly access database
* contain business rules
* become “fat controllers”

### 5.3 Application Layer

Location:

* `src/server/application`

Responsibilities:

* orchestrate business flows
* coordinate repositories
* enforce use-case-specific rules
* manage transactional application logic

Examples:

* create order
* publish event
* validate check-in
* apply coupon
* generate tickets

Application layer SHOULD be:

* framework-agnostic
* reusable
* deterministic when possible
* easy to move into NestJS later

### 5.4 Domain Layer

Location:

* `src/server/domain`

Responsibilities:

* entities
* value objects
* enums
* invariants
* central business concepts

Examples:

* order statuses
* ticket validity rules
* event publication constraints
* stock/availability concepts

Domain layer MUST NOT:

* import framework code
* import DB clients
* import HTTP concerns

### 5.5 Repository Layer

Location:

* `src/server/repositories`

Responsibilities:

* define contracts/interfaces
* implement persistence logic
* isolate ORM usage from business logic

Examples:

* `event.repository.ts`
* `order.repository.ts`
* `ticket.repository.ts`

Repositories MUST:

* expose business-relevant persistence methods
* hide query details from use-cases

### 5.6 Infrastructure Layer

Location:

* `src/server/infrastructure`

Responsibilities:

* database client setup
* Neon connection
* Drizzle configuration
* auth provider integration
* QR generation adapters
* e-mail adapters
* external services

Infrastructure code MUST remain replaceable.

---

## 6. Coding Rules

### 6.1 Forbidden

Agents MUST NOT:

* fetch directly from database in UI components
* put business rules inside route handlers
* mix database logic with presentation code
* hardcode role permissions inside random UI files
* bypass repositories from use-cases
* couple core business logic to Vinext runtime APIs
* create unnecessary abstractions without clear value

### 6.2 Required

Agents MUST:

* validate all external input with Zod
* use repository pattern for persistence
* keep handlers thin
* keep use-cases focused
* favor small, composable functions
* preserve architectural boundaries
* follow existing patterns once established

---

## 7. Naming Conventions

### 7.1 Files

Use-case files:

```text
create-order.use-case.ts
publish-event.use-case.ts
validate-checkin.use-case.ts
```

Repository files:

```text
event.repository.ts
order.repository.ts
ticket.repository.ts
```

DTO/schema files:

```text
create-order.schema.ts
publish-event.schema.ts
```

Types and contracts:

```text
order.types.ts
ticket.contracts.ts
```

### 7.2 Functions

Prefer explicit names:

* `createOrder`
* `publishEvent`
* `validateTicketCheckin`
* `findPublishedEventBySlug`

Avoid vague names:

* `handleData`
* `processThing`
* `run`
* `executeStuff`

---

## 8. Validation Rules

All external input MUST be validated.

External input includes:

* HTTP request body
* query params
* route params
* form input
* webhook payloads
* URL-derived values
* third-party responses when relevant

Use Zod schemas for validation.

Validation strategy:

1. Define schema
2. Parse/validate input at the handler boundary
3. Pass typed input to the use-case
4. Never rely on UI-only validation

---

## 9. Error Handling

### 9.1 General Rules

* Errors must be structured.
* Do not leak raw DB errors to users.
* Prefer typed/domain-aware errors where useful.
* Return stable error shapes from handlers.

### 9.2 Recommended Error Categories

* validation error
* authentication error
* authorization error
* not found
* conflict/business rule violation
* infrastructure/internal error

### 9.3 Error Boundaries

* handlers translate application/domain errors into response-safe output
* repositories should not define user-facing messages
* domain/application should describe intent, not HTTP formatting

---

## 10. Security Rules

### 10.1 Authentication

Authentication must be enforced at the handler/service boundary where required.

### 10.2 Authorization

Use role-based access control (RBAC).

Supported roles:

* `customer`
* `organizer`
* `admin`
* `checker`

Examples:

* customer can buy and view own tickets
* organizer can manage only own events
* checker can validate tickets for authorized events
* admin has platform-wide access

### 10.3 Data Trust Model

Never trust:

* price sent by client
* event ownership claimed by client
* order totals from frontend
* ticket status from client
* role claims without server verification

Always derive sensitive data server-side.

---

## 11. Database Rules

### 11.1 Database Choice

Primary database direction:

* **Neon PostgreSQL**

Reason:

* aligned with future NestJS backend
* avoids SQLite/D1 → Postgres migration pain
* production-oriented data model from day one

### 11.2 ORM Choice

Preferred ORM:

* **Drizzle ORM**

Reason:

* better alignment with modern edge/serverless workflows
* lightweight
* explicit SQL-oriented approach
* easier control over schema and queries

### 11.3 Schema Management

Agents MUST:

* use migrations
* keep schema changes explicit
* avoid ad hoc production mutations
* keep DB schema aligned with domain intent

---

## 12. Docker and Containers

Docker is an approved and recommended part of this project.

### 12.1 Purpose of Docker in This Project

Docker SHOULD be used for:

* local development standardization
* auxiliary service orchestration
* future backend separation
* CI consistency
* running local PostgreSQL if needed
* running local supporting tools

### 12.2 Important Constraint

The production demo runtime target is **Cloudflare Workers**, so Docker is NOT the final production runtime for the Vinext app deployed there.

Therefore:

* use Docker for development and tooling
* do not architect the app as if Workers were a traditional long-running Node container
* keep runtime assumptions compatible with Workers/serverless execution

### 12.3 Recommended Docker Use Cases

Allowed and encouraged:

* `docker-compose` / `compose.yaml` for local services
* local PostgreSQL for isolated development if Neon is not used locally
* local mail testing tools
* future NestJS service containerization
* background utility tools used in development

### 12.4 Docker Design Guidance

Agents SHOULD:

* keep Docker setup simple
* avoid overengineering local infra
* prefer reproducible development environments
* document required services clearly

---

## 13. State Management

Preferred approach:

* server-first data loading when possible
* keep client state minimal
* use local state for UI concerns
* use React Query only when there is clear value

Avoid:

* unnecessary global state
* duplicating server truth in many places
* storing business-critical calculations only in the client

---

## 14. Feature Development Workflow

When implementing a feature, agents SHOULD follow this sequence:

1. define the business goal
2. define or update the domain model if needed
3. create validation schema
4. define input/output contracts
5. write the first failing automated test for the next behavior
6. implement use-case/application code with the minimum change to make the test pass
7. add or update repository methods as needed by the use-case
8. implement thin handler
9. connect UI
10. refactor while keeping tests green
11. run relevant tests and key flow checks
12. keep architecture boundaries intact

---

## 15. Example Flow — Create Order

Expected implementation pattern:

1. user selects tickets in UI
2. UI submits request
3. handler validates payload
4. handler resolves authenticated user if needed
5. handler calls `createOrder` use-case
6. use-case:

   * loads event/lot data
   * validates availability
   * calculates totals on server
   * applies coupon rules if present
   * creates order
   * creates order items
   * generates ticket records when appropriate
7. repository persists data
8. handler returns structured response

Important:

* pricing must be computed server-side
* stock validation must be server-side
* ticket generation must be server-side

---

## 16. Ticketing Domain Rules

Agents must preserve these domain rules.

### 16.1 Event Rules

* an event cannot be published without the minimum required sale configuration
* unpublished/cancelled events must not appear as publicly purchasable
* organizer access is limited to owned events unless admin

### 16.2 Lot Rules

* lots must respect sale windows
* lots cannot oversell beyond available quantity
* per-order limits must be enforced server-side

### 16.3 Order Rules

* order totals must be computed server-side
* order status transitions must be explicit
* expired unpaid orders must not produce valid active tickets

### 16.4 Ticket Rules

* a used ticket cannot be reused
* cancelled tickets are invalid
* check-in must prevent duplicate usage
* check-in validation must confirm ticket belongs to the target event context

### 16.5 Coupon Rules

* coupons must respect validity window
* coupons must respect usage limits
* coupon applicability must be verified against event/order rules

---

## 17. Performance Guidelines

Agents SHOULD:

* avoid unnecessary client re-renders
* keep handlers thin
* avoid N+1 database patterns when possible
* fetch only required fields
* be mindful of serverless/edge constraints
* avoid unnecessarily heavy dependencies

Do not optimize prematurely at the expense of clarity, but do not ignore obvious inefficiencies.

### 17.1 3D UI and Motion Direction

The project also intends to adopt a more modern visual direction with 3D UI.

Approved and preferred tools for this direction include:

* `three.js`
* `@react-three/fiber` (React Three Fiber)
* `@react-three/drei` when useful
* motion libraries for React (e.g. Framer Motion / React Motion)

Rules for 3D implementation:

* the existing ready 3D model provided by the project owner should be reused as the primary asset
* agents may add camera movement, lighting animation, and scene transitions to improve perceived quality
* 3D must remain presentation-layer only (never business logic)
* provide graceful fallback for low-end/mobile devices
* keep payload and render cost controlled (lazy-load heavy assets, avoid unnecessary draw calls)
* preserve accessibility and usability even when 3D is disabled
* do not break architecture boundaries while implementing visual effects
* prioritize smooth performance and fast initial load over visual excess

---

## 18. Testing Guidance and TDD Rules

### 18.1 TDD Is Mandatory

Agents MUST use TDD for:

* new features
* bug fixes
* behavior changes
* refactoring that changes behavior or risk profile

Core TDD law:

* no production code without a failing automated test first
* if a test was not observed failing first, it is not valid evidence for the new behavior

### 18.2 Required Red-Green-Refactor Cycle

1. **Red:** write one minimal failing test for one behavior
2. **Verify Red:** run the test and confirm it fails for the expected reason
3. **Green:** implement the smallest change needed to pass
4. **Verify Green:** run relevant tests and confirm all affected tests pass
5. **Refactor:** improve design/readability without changing behavior, keeping tests green
6. repeat one behavior at a time

### 18.3 Test Scope and Priorities

Preferred testable units:

* use-cases
* domain rules
* validation schemas
* critical handler paths
* repository behavior where relevant

Priority areas:

1. order creation
2. stock validation
3. coupon application
4. ticket generation
5. check-in validation
6. authorization rules

### 18.4 Regression and Exceptions

* every bug fix MUST start with a failing regression test that reproduces the issue
* exceptions are limited to generated code, one-off scripts, or pure configuration changes
* any exception to TDD MUST be explicitly documented in task notes/PR description with rationale
* a task is not complete until relevant tests are passing

---

## 19. Migration Strategy

This codebase must remain ready for future migration.

### 19.1 Vinext → Next.js

UI and routing may change, but business logic should remain intact.

### 19.2 Internal Server Layer → NestJS

The following should be portable with minimal changes:

* domain
* application/use-cases
* repository contracts
* validation schemas
* most repository implementations, with adapter updates if needed

### 19.3 What Must Be Easy to Replace

* HTTP adapters
* auth integration details
* framework-specific routing
* deployment-specific glue code

---

## 20. Agent Behavior Rules

Agents working in this repository MUST:

* respect architectural boundaries
* avoid inventing patterns not justified by the project
* prefer consistency over novelty
* keep code easy to migrate
* preserve domain clarity
* avoid mixing concerns
* avoid unnecessary rewrites
* extend the existing architecture instead of bypassing it

When uncertain, agents SHOULD choose:

1. correctness
2. architecture integrity
3. maintainability
4. clarity
5. performance
6. developer convenience

---

## 21. Final Rule

If a proposed implementation breaks layer boundaries or increases coupling to the current framework without strong justification, that implementation is considered invalid.

The architecture is the product foundation. Preserve it.

```

Se quiser, eu também posso te entregar isso já em uma **versão expandida para uso real com Codex**, incluindo:

- stack rules
- branch rules
- commit rules
- task execution workflow
- Definition of Done
- padrões de Docker
- padrões de migração Drizzle
- convenções para handlers/use-cases/repositories
```
