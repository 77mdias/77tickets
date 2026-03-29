# Design Spec — Sprint 006: Auth Integration & Schema Completion

> Data: 2026-03-29
> Status: Aprovado
> Fase: 006 | Sprint: 006

---

## Contexto e Objetivo

A Fase 005 encerrou com o núcleo de operações organizer/admin completo, mas a identidade de usuário é um placeholder: `customerId` e `organizerId` são UUIDs sem FK enforcement, e todos os handlers recebem `userId`/`role` injetados arbitrariamente.

Esta sprint fecha esse gap integrando auth real (Better Auth), criando a tabela `users` com FKs de referência nas tabelas existentes, e completando o schema de eventos com campos de apresentação necessários para as fases seguintes.

---

## Decisões de Design

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Biblioteca de auth | Better Auth | Edge-native, adapter Drizzle oficial, self-hosted, OAuth-ready para futuro |
| Estratégia de auth | Email + senha (OAuth-ready) | Demo funcional agora, estrutura extensível depois |
| Armazenamento de role | Campo `role` na tabela `user` do Better Auth | Roles fixos (4), sem necessidade de tabela separada, role disponível na sessão |
| Role padrão no cadastro | `customer` ou `organizer` selecionável; `admin`/`checker` via promoção | Reflete personas do PRD; roles elevados não expostos publicamente |
| Extração de sessão | No `route-adapter`, não no `handler` | Handler permanece agnóstico ao Better Auth; adapter é o glue de framework por definição |
| Integração de schema | Better Auth como store canônico (Abordagem A) | Única tabela de usuário, sem sync; `UserRepository` wrappa via Drizzle |

---

## Seção 1: Schema

### Tabelas geradas pelo Better Auth

```
user         — id, name, email, emailVerified, image, role, createdAt, updatedAt
session      — id, expiresAt, token, userId, ipAddress, userAgent, createdAt, updatedAt
account      — id, accountId, providerId, userId, accessToken, refreshToken, ...
verification — id, identifier, value, expiresAt, createdAt, updatedAt
```

O campo `role` é adicionado via `additionalFields` no `auth.config.ts` e refletido no schema Drizzle customizado.

### Schema Drizzle customizado para `user`

```ts
// src/server/infrastructure/db/schema/users.ts
import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core"

export const userRoleEnum = ["customer", "organizer", "admin", "checker"] as const
export type UserRole = (typeof userRoleEnum)[number]

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").$type<UserRole>().notNull().default("customer"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
```

### Migrações adicionais

1. **FK `orders.customer_id → user.id`** — sem cascade (pedido preservado se user for desativado)
2. **FK `events.organizer_id → user.id`** — sem cascade
3. **Campos de apresentação em `events`**: `description text`, `location text`, `image_url text` — todos nullable

### `UserRecord` e `UserRepository`

```ts
// src/server/repositories/user.repository.contracts.ts
export type UserRole = "customer" | "organizer" | "admin" | "checker"

export interface UserRecord {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: Date
}

export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>
  findByEmail(email: string): Promise<UserRecord | null>
  save(user: UserRecord): Promise<void>
}
```

Implementação `DrizzleUserRepository` faz query na tabela `user` do Better Auth via Drizzle — sem tabela duplicada.

---

## Seção 2: Infraestrutura de Auth

### Estrutura de arquivos

```
src/server/infrastructure/auth/
  auth.config.ts       ← configuração central do Better Auth (server-side)
  auth.client.ts       ← createAuthClient() para uso em client components (sign-in/sign-up forms)
  index.ts

src/app/api/auth/
  [...all]/route.ts    ← rota catch-all (GET + POST)
```

### `auth.config.ts`

```ts
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/server/infrastructure/db"
import * as schema from "@/server/infrastructure/db/schema"

const ALLOWED_SIGNUP_ROLES = ["customer", "organizer"] as const

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "customer",
        input: true,
      },
    },
  },
  hooks: {
    before: [
      {
        matcher: (ctx) => ctx.path === "/sign-up/email",
        handler: async (ctx) => {
          const role = (ctx.body as Record<string, unknown>)?.role
          if (role && !ALLOWED_SIGNUP_ROLES.includes(role as never)) {
            throw new AppError("FORBIDDEN", "Role não permitido no cadastro público")
          }
        },
      },
    ],
  },
})
```

### `auth.client.ts`

```ts
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
})
```

Usado nos formulários client-side de login e cadastro (`signIn.email()`, `signUp.email()`). Não é usado na camada de API server-side — lá usa-se `auth.api.getSession()` diretamente.

### Rota catch-all

```ts
// src/app/api/auth/[...all]/route.ts
import { auth } from "@/server/infrastructure/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth)
```

Endpoints expostos automaticamente:
- `POST /api/auth/sign-up/email`
- `POST /api/auth/sign-in/email`
- `POST /api/auth/sign-out`
- `GET /api/auth/session`

### Compatibilidade Cloudflare Workers

Better Auth usa `@neondatabase/serverless` via Drizzle — já presente no projeto. Configurar `trustedOrigins` no `auth.config.ts` para o domínio Workers em produção. Sem APIs Node.js persistentes no caminho crítico.

### Variáveis de ambiente adicionais

```
BETTER_AUTH_SECRET=       # string aleatória longa (≥32 chars)
BETTER_AUTH_URL=          # URL base da aplicação (server-side)
NEXT_PUBLIC_APP_URL=      # URL base da aplicação (client-side, para authClient)
```

---

## Seção 3: Session Middleware e Route Adapters

### `get-session.ts`

```
src/server/api/auth/
  get-session.ts
  index.ts
```

```ts
import { auth } from "@/server/infrastructure/auth"
import { AppError } from "@/server/application/errors"
import type { UserRole } from "@/server/repositories/user.repository.contracts"

export type SessionContext = {
  userId: string
  role: UserRole
}

export async function getSession(request: Request): Promise<SessionContext> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw new AppError("UNAUTHORIZED", "Sessão inválida ou expirada")
  return {
    userId: session.user.id,
    role: session.user.role as UserRole,
  }
}
```

### Padrão de atualização dos 6 route adapters

```ts
// ANTES
const body = await request.json()
const result = await handler({ ...body, userId: body.userId, role: body.role })

// DEPOIS
const session = await getSession(request)
const body = await request.json()
const result = await handler({ ...body, userId: session.userId, role: session.role })
```

Adapters afetados:
- `create-order.route-adapter.ts`
- `validate-checkin.route-adapter.ts`
- `publish-event.route-adapter.ts`
- `update-event.route-adapter.ts` (dentro de `events.route-adapter.ts`)
- `create-coupon.route-adapter.ts` (dentro de `coupons.route-adapter.ts`)
- `update-coupon.route-adapter.ts` (dentro de `coupons.route-adapter.ts`)

**Os handlers não mudam de assinatura.**

---

## Seção 4: Estratégia de Testes

### Princípio

Sessão extraída no adapter → testes de handler continuam isolados. Testes de adapter mocam `getSession`. Testes de integração usam sessão real via Better Auth.

### Testes unitários

| Arquivo | Cobertura |
|---------|-----------|
| `tests/unit/server/api/auth/get-session.test.ts` | Retorna `SessionContext` válido; lança `UNAUTHORIZED` sem sessão |
| `tests/unit/server/api/*/route-adapter.test.ts` (atualizar) | Adapter chama `getSession`; repassa `userId`/`role` ao handler; `401` sem sessão |
| `tests/unit/server/repositories/drizzle-user.repository.test.ts` | `findById`, `findByEmail`, `save` |

Testes de handler existentes (`*.handler.test.ts`) **não mudam**.

### Testes de integração

```
tests/integration/api/auth/
  sign-up.integration.test.ts    ← cadastro; role salvo corretamente; role admin rejeitado
  sign-in.integration.test.ts    ← login retorna sessão válida; senha errada → 401
  session.integration.test.ts    ← request sem sessão → 401 em todos os endpoints protegidos
```

**Fixtures:** `tests/fixtures/index.ts` recebe `createUser(role)` para criar usuários reais antes de orders/events nos testes existentes.

### Testes de regressão

```
tests/regression/auth/
  rbac-with-real-session.regression.test.ts
```

Cenários: customer não acessa endpoint de organizer; organizer não acessa evento de outro organizer; checker sem evento vinculado bloqueado. Replica cenários dos testes de autorização existentes com sessão real.

### Cenários completos (Etapa 2 do Sprint)

- [ ] Cadastro com `role: customer` → user criado com role correto
- [ ] Cadastro com `role: organizer` → user criado com role correto
- [ ] Cadastro com `role: admin` → rejeitado (não permitido no cadastro público)
- [ ] Cadastro com `role: checker` → rejeitado (não permitido no cadastro público)
- [ ] Login com credenciais válidas → sessão retornada com `userId` e `role`
- [ ] Login com senha errada → `401`
- [ ] Request sem sessão em endpoint protegido → `401`
- [ ] Customer tenta acessar endpoint de organizer → `403`
- [ ] Organizer acessa evento de outro organizer → `403`
- [ ] Todas as RBAC policies existentes passam com sessão real

---

## Arquivos a Criar / Modificar

### Criar
- `src/server/infrastructure/db/schema/users.ts`
- `src/server/infrastructure/auth/auth.config.ts`
- `src/server/infrastructure/auth/auth.client.ts`
- `src/server/infrastructure/auth/index.ts`
- `src/app/api/auth/[...all]/route.ts`
- `src/server/api/auth/get-session.ts`
- `src/server/api/auth/index.ts`
- `src/server/repositories/user.repository.contracts.ts`
- `src/server/repositories/drizzle/drizzle-user.repository.ts`
- `tests/unit/server/api/auth/get-session.test.ts`
- `tests/unit/server/repositories/drizzle-user.repository.test.ts`
- `tests/integration/api/auth/sign-up.integration.test.ts`
- `tests/integration/api/auth/sign-in.integration.test.ts`
- `tests/integration/api/auth/session.integration.test.ts`
- `tests/regression/auth/rbac-with-real-session.regression.test.ts`
- `docs/development/Logs/SCH-001.md` (evidência de migration)
- `docs/development/Logs/AUTH-001.md` (evidência de integração)

### Modificar
- `src/server/infrastructure/db/schema/index.ts` — exportar tabelas Better Auth
- `src/server/infrastructure/db/schema/orders.ts` — adicionar FK `customer_id → user.id`
- `src/server/infrastructure/db/schema/events.ts` — adicionar FK `organizer_id → user.id` + campos de apresentação
- `src/server/repositories/event.repository.contracts.ts` — adicionar `description`, `location`, `imageUrl` ao `EventRecord`
- `src/server/repositories/drizzle/drizzle-event.repository.ts` — incluir novos campos no select
- `src/server/api/*/route-adapter.ts` (6 arquivos) — extrair sessão via `getSession`
- `tests/fixtures/index.ts` — adicionar `createUser(role)` helper
- `tests/integration/*/auth.test.ts` (4 arquivos) — usar sessão real em vez de payload mockado
- `.env.example` — documentar `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL`
- `package.json` — adicionar dependência `better-auth`

---

## Critérios de Conclusão

- [ ] Tabela `user` com `role` + tabelas de sessão/account/verification criadas via migration
- [ ] FKs em `orders.customer_id` e `events.organizer_id` aplicadas
- [ ] Campos `description`, `location`, `image_url` em `events`
- [ ] `POST /api/auth/sign-up/email` e `POST /api/auth/sign-in/email` funcionais
- [ ] Todos os 6 route adapters extraem sessão real
- [ ] `npm run test` verde (unit + regression + integration)
- [ ] `npm run lint:architecture` sem violações
