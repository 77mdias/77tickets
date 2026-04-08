# Code Conventions

**Analysis Date:** 2025-01-31

---

## Language & Types

**TypeScript strict mode** is enforced via `tsconfig.json`:
- `"strict": true` — full strict mode (noImplicitAny, strictNullChecks, etc.)
- `"target": "ES2017"`, `"module": "esnext"`
- `"isolatedModules": true` — each file must be independently compilable
- `"moduleResolution": "bundler"`

**Type annotations:**
- Use `interface` for object shapes that are exported or publicly visible
- Use `type` for unions, aliases, and computed types
- Prefer explicit return types on exported functions
- Use `unknown` (not `any`) for untyped external values before validation

---

## Naming Conventions

**Files:**
- Use-cases: `<verb>-<noun>.use-case.ts` (e.g., `create-order.use-case.ts`)
- Handlers: `<verb>-<noun>.handler.ts` (e.g., `create-order.handler.ts`)
- Route adapters: `<noun>.route-adapter.ts` (e.g., `create-order.route-adapter.ts`)
- Schemas: `<verb>-<noun>.schema.ts` (e.g., `create-order.schema.ts`)
- Repositories: `drizzle-<noun>.repository.ts` (implementation), `<noun>.repository.contracts.ts`
- Domain rules: `<noun>.rules.ts` (e.g., `order.rules.ts`)
- Tests mirror the source path: `tests/unit/server/api/events/create-event.handler.test.ts`

**Functions:**
- Factory functions: `create<Name>` prefix (e.g., `createCreateOrderHandler`, `createCreateOrderUseCase`)
- Error factories: `create<ErrorCode>Error` (e.g., `createConflictError`, `createValidationError`)
- Boolean predicates: `is<Condition>` or `can<Action>` (e.g., `isAppError`, `canTransitionOrder`)
- Validators: `validate<Subject>` or `assert<Subject>` (e.g., `validateOrderTransition`, `assertCreateOrderAccess`)

**Types/Interfaces:**
- PascalCase (e.g., `AppError`, `CreateOrderRequest`, `SecurityActor`)
- Dependency bags: `<Name>Dependencies` (e.g., `CreateOrderHandlerDependencies`)
- Use-case type aliases: `<Name>UseCase` (e.g., `CreateOrderUseCase`)

**Variables/Constants:**
- camelCase for local variables and parameters
- SCREAMING_SNAKE_CASE for module-level constants (e.g., `HTTP_STATUS_BY_ERROR_CODE`, `FIXED_NOW`)

---

## File Organization

**Path alias:** `@/*` maps to `src/*` (used for all cross-directory imports)

**Server layers** (enforced by ESLint `no-restricted-imports`):
```
src/server/
├── api/            # Thin handlers and route adapters (no business logic)
│   ├── schemas/    # Zod schemas per endpoint
│   ├── validation/ # parseInput utility
│   └── middleware/
├── application/    # Use-cases, policies, orchestration (framework-agnostic)
│   ├── errors/     # AppError class and factory functions
│   ├── security/   # RBAC policies
│   └── use-cases/
├── domain/         # Pure domain types, rules, invariants (no dependencies)
│   ├── orders/     # order.rules.ts, order.types.ts
│   ├── lots/
│   ├── tickets/
│   └── coupons/
├── repositories/   # Persistence contracts and Drizzle implementations
├── infrastructure/ # DB client, schema, replaceable adapters
├── email/          # Email providers and templates
└── payment/        # Stripe isolation
```

**UI layers:**
```
src/app/            # Next.js App Router pages and API routes
src/features/       # Feature-scoped components (can import from each other)
src/components/     # Shared UI components
```

**Barrel exports:** Each directory exposes an `index.ts` barrel for its public API.

---

## Error Handling

**Error class:** `AppError` (`src/server/application/errors/app-error.ts`)

```typescript
class AppError extends Error {
  code: AppErrorCode;        // "validation" | "unauthenticated" | "authorization" |
                              //  "not-found" | "conflict" | "rate_limited" | "internal"
  details?: Record<string, unknown>;
  traceId?: string;
}
```

**Factory functions** (preferred over `new AppError(...)`):
```typescript
createValidationError(message, { details })
createNotFoundError(message)
createConflictError(message, { details: { reason: "out_of_window" } })
createAuthorizationError(message)
createUnauthenticatedError(message)
createRateLimitedError(message)
createInternalError(message, { cause })
```

**HTTP mapping** is done at the API boundary in `src/server/api/error-mapper.ts`:
- `validation` → 400, `unauthenticated` → 401, `authorization` → 403
- `not-found` → 404, `conflict` → 409, `rate_limited` → 429, `internal` → 500

**Pattern:** Handlers always wrap use-case calls in try/catch and call `mapAppErrorToResponse(error)`. Never leak raw DB/ORM errors to clients. Unknown errors are mapped to `internal` via `mapUnknownErrorToAppError`.

**Observability:** Audit logging and telemetry calls are wrapped in `try/catch` with swallowed errors — observability must never break request flow.

---

## Validation Patterns

**Zod** is the exclusive validation library. All external input (body, params, query, webhooks) must be validated with Zod at API boundaries.

**Schema location:** `src/server/api/schemas/<endpoint>.schema.ts`

**Schema convention:**
- Use `.strict()` on objects to reject unknown fields (prevents client-supplied pricing injection)
- Use `.uuid()` for ID fields
- Use `.trim()` on string inputs
- Type schemas as `z.ZodType<ExpectedInputType>` to align with use-case input types

```typescript
// src/server/api/schemas/create-order.schema.ts
export const createOrderSchema: z.ZodType<CreateOrderInput> = z.object({
  eventId: z.uuid(),
  customerId: z.uuid(),
  items: z.array(z.object({ lotId: z.uuid(), quantity: z.number().int().positive() }).strict()).min(1),
  couponCode: z.string().trim().min(1).max(64).optional(),
}).strict();
```

**Parsing utility:** `parseInput(schema, payload)` from `src/server/api/validation/parse-input.ts`
- Calls `schema.safeParse(payload)`
- Throws `AppError("validation", ...)` with `details.issues` array on failure

---

## Import Patterns

**Path alias:** Use `@/` prefix for all cross-directory src imports, never relative paths that traverse more than one level.

```typescript
// Preferred
import { createConflictError } from "@/server/application/errors";
import type { CreateOrderUseCase } from "@/server/application/use-cases";

// Integration tests use relative paths from test root
import { createCreateOrderUseCase } from "../../../../src/server/application/use-cases/create-order.use-case";
```

**Import order convention** (observed in source files):
1. `node:` built-ins
2. External packages
3. `@/` alias imports (grouped by layer: application → domain → repositories → schemas)
4. Relative imports (within same directory)

**Import type:** Prefer `import type { ... }` for type-only imports to avoid runtime bloat.

**Layer isolation** (enforced by ESLint rules):
- `src/app/**` and `src/features/**` → cannot import from `@/server/**`
- `src/server/api/**` → cannot import from repositories, infrastructure, or `stripe`
- `src/server/application/**` → cannot import from api, infrastructure, `next/**`, or `stripe`
- `src/server/domain/**` → cannot import from api, application, repositories, infrastructure, or any framework
- `src/server/repositories/**` and `src/server/infrastructure/**` → cannot import `stripe` directly

---

## Component Patterns

**Client components** use `"use client"` directive as the first line:
```typescript
"use client";
import { useState } from "react";
```

**Client components are placed in** `src/features/<feature>/` (e.g., `checkout-form.tsx`, `event-search.tsx`)

**View state pattern** (discriminated union for loading/error/idle):
```typescript
type CheckoutViewState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };
```

**Props interface:** Always named `<ComponentName>Props` and declared as `export interface`.

**Server/client split:** Pages in `src/app/` are server components by default. Client interactivity is delegated to feature components in `src/features/`. No business logic in UI components.

**UI components** use Tailwind CSS classes; interactive elements use shadcn/ui primitives.

---

## Use-Case Factory Pattern

Use-cases are created via a factory function that accepts a typed dependency bag (dependency injection):

```typescript
export function createCreateOrderUseCase(deps: CreateOrderUseCaseDependencies): CreateOrderUseCase {
  return async (input) => { /* ... */ };
}
```

This enables easy mocking in unit tests by substituting individual deps without a full DI container.

---

## TDD Rules

- **TDD is mandatory** for new features, bug fixes, and behavior changes.
- Write a failing test first, then implement, then refactor.
- Every bug fix must have a corresponding regression test in `tests/regression/`.
- A task is only complete when acceptance criteria are met and all tests pass.
