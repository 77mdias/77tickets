# MIG-010 - Migration Readiness Audit Inventory

Date: 2026-04-01
Scope: `src/server/**`
Method: repo scan with `rg` and focused `sed` reads of boundary, application, repository, and infrastructure files.

## 1) Executive summary

- No direct `next` or `vinext` imports were found under `src/server/**`.
- `src/server/domain/**` is cleanly portable: the scan found internal imports only, with no framework, runtime, or ORM coupling.
- `src/server/application/**` is also portable: the scan found internal imports only, plus one runtime UUID fallback in `create-order.use-case.ts` using `globalThis.crypto.randomUUID()`.
- Repository contracts remain portable and Drizzle-free.
- Drizzle and Neon coupling is isolated to `src/server/repositories/drizzle/**` and `src/server/infrastructure/db/**`.
- Workers coupling is explicit in the DB client and rate limiter; it is contained in infrastructure/API boundary code, not in domain/application.
- The only Next-style token found in `src/server/**` is `NEXT_PUBLIC_APP_URL` in `src/server/infrastructure/auth/auth.client.ts`; this is env naming, not a `next` runtime import.

## 2) Inventory table

| file | dependency/API | layer | severity | note |
|---|---|---|---|---|
| `src/server/domain/**/*.ts` | internal TS types/rules only | domain | green | No external imports found in domain. Portable and framework-agnostic. |
| `src/server/application/**/*.ts` | internal modules only, plus `globalThis.crypto.randomUUID()` in `create-order.use-case.ts` | application | green | No framework/runtime imports. The only runtime API observed is Web Crypto for UUID fallback. |
| `src/server/api/validation/parse-input.ts` | `zod` | api | green | Boundary validation only. Matches the repo rule that external input must be validated with Zod. |
| `src/server/api/error-mapper.ts` | internal app error serialization | api | green | Stable error mapping, no runtime coupling. |
| `src/server/api/**/handler.ts` | internal use-case and schema contracts | api | green | Handlers stay thin and delegate business logic to application code. |
| `src/server/api/**/route-adapter.ts` | `Request`, `Response.json()`, `request.json()`, fetch-style boundary | api | yellow | Transport adapter code only. No Next/Vinext import found; coupling is to the Web Fetch API boundary. |
| `src/server/api/auth/get-session.ts` | `Request.headers`, auth session adapter | api | yellow | Thin session resolution boundary. No business logic. |
| `src/server/api/middleware/rate-limiter.ts` | in-memory `Map`, Cloudflare Workers note, future KV note | api | yellow | Explicitly documented as Workers-compatible demo code; the store is per-instance only. |
| `src/server/infrastructure/db/client.ts` | `@neondatabase/serverless`, `drizzle-orm/neon-serverless`, `Pool` | infrastructure | yellow | Workers-aware DB client. Implementation-specific to Neon/Drizzle transport. |
| `src/server/infrastructure/db/index.ts` | `process.env.DATABASE_URL`, `process.env.TEST_DATABASE_URL` | infrastructure | yellow | Runtime configuration binding only. No business logic. |
| `src/server/infrastructure/auth/auth.config.ts` | `better-auth`, `drizzleAdapter`, `createAuthMiddleware`, `APIError`, `crypto.randomUUID()`, `process.env.BETTER_AUTH_URL` | infrastructure | yellow | Auth adapter is replaceable; coupling is limited to auth provider wiring and config. |
| `src/server/infrastructure/auth/auth.client.ts` | `better-auth/react`, `process.env.NEXT_PUBLIC_APP_URL` | infrastructure | yellow | Only Next-style env token found in `src/server/**`. This is naming/config coupling, not a Next runtime API. |
| `src/server/infrastructure/auth/get-session.ts` | `Request`, auth API session lookup | infrastructure | yellow | Adapter glue between request headers and auth provider session lookup. |
| `src/server/repositories/*.contracts.ts` | internal domain types and plain TS interfaces | repositories | green | Contracts are portable and do not import Drizzle or schema objects. |
| `src/server/repositories/drizzle/*.ts` | `drizzle-orm`, `Db`, schema tables, transactions, returning clauses | repositories | yellow | Drizzle-specific persistence implementations. This coupling is confined to the implementation layer. |
| `src/server/repositories/drizzle/map-persistence-error.ts` | Postgres error codes `23503`, `23505`, `23514` | repositories | yellow | Database-specific error translation. Correctly kept out of the contracts layer. |
| `src/server/repositories/index.ts` | re-exports contracts and `./drizzle` | repositories | yellow | The barrel exposes both contracts and implementations, so import discipline matters even though the layers are separated in source files. |

## 3) Portability list for domain/application modules

### Portable

- `src/server/domain/shared.types.ts`
- `src/server/domain/events/**`
- `src/server/domain/lots/**`
- `src/server/domain/orders/**`
- `src/server/domain/tickets/**`
- `src/server/domain/coupons/**`
- `src/server/application/errors/**`
- `src/server/application/checkin/**`
- `src/server/application/coupons/**`
- `src/server/application/events/**`
- `src/server/application/orders/**`
- `src/server/application/security/**`
- `src/server/application/use-cases/**`

### Exceptions or portability notes

- No import-level exceptions were found in `src/server/domain/**` or `src/server/application/**`.
- `src/server/application/use-cases/create-order.use-case.ts` uses `globalThis.crypto.randomUUID()` as a fallback UUID source. This is a runtime API, but it is not a framework import and is compatible with both Workers and modern Node runtimes.

## 4) Repository portability notes

- The contracts layer is portable:
  - `src/server/repositories/common.repository.contracts.ts`
  - `src/server/repositories/event.repository.contracts.ts`
  - `src/server/repositories/lot.repository.contracts.ts`
  - `src/server/repositories/order.repository.contracts.ts`
  - `src/server/repositories/ticket.repository.contracts.ts`
  - `src/server/repositories/coupon.repository.contracts.ts`
  - `src/server/repositories/user.repository.contracts.ts`
- These contracts use internal domain types and plain TypeScript interfaces only.
- Drizzle-specific concerns are isolated to `src/server/repositories/drizzle/**`:
  - query building with `drizzle-orm`
  - schema-table imports from `src/server/infrastructure/db/schema`
  - transaction handling and `returning()` usage
  - Postgres constraint-code mapping in `map-persistence-error.ts`
- `src/server/repositories/persistence-error.ts` and `src/server/application/errors/map-unknown-error.ts` keep persistence failures translated into stable application error categories.
- The separation is structurally correct, but the `src/server/repositories/index.ts` barrel exports both contracts and implementations, so callers must import intentionally to avoid coupling to Drizzle.

## 5) MIG conclusions

### MIG-001

Inventário de acoplamentos a Vinext/Next concluído para `src/server/**`. Nenhum import direto de `next/*` ou `vinext/*` foi encontrado nas camadas protegidas.

### MIG-002

Inventário de acoplamentos a Workers concluído. Acoplamentos de runtime aparecem apenas em boundary/infra (db client, auth/config, middleware), sem APIs de Workers em `domain/application`.

### MIG-003

Portabilidade de `domain/application` confirmada em nível de import: sem dependências de framework/runtime nessas camadas.

### MIG-004

Contratos de repositório confirmados como portáveis; acoplamento Drizzle permanece isolado em `src/server/repositories/drizzle/**`.
