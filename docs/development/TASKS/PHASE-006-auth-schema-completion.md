# Tasks - Fase 006: Auth Integration & Schema Completion

**Status:** CONCLUÍDA
**Última atualização:** 2026-03-30
**Sprint Atual:** Sprint 006
**Status Geral:** 100% (10/10 tarefas completas)
**ETA:** —
**Pré-requisito:** Fase 005 (concluída)

---

## Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Schema & Migrations | 5 | 5 | 0 | 0 | 0 |
| Auth Integration | 5 | 5 | 0 | 0 | 0 |
| **TOTAL** | **10** | **10** | **0** | **0** | **0** |

---

## Objetivos da Fase

- Criar tabela `users` com campos de role e adicionar FKs de referência nas tabelas existentes.
- Completar schema de eventos com campos de apresentação (`description`, `location`, `imageUrl`).
- Integrar biblioteca de auth real (Better Auth com adapter Drizzle).
- Implementar session middleware para extrair `userId`/`role` da sessão em todos os handlers.
- Adaptar handlers existentes para usar identidade real da sessão em vez de mocks.
- Cobrir autenticação com testes de integração e regressão de RBAC.

---

## Schema & Migrations — Completar modelo de dados

### SCH-001 - Tabela users e FKs

- [x] **SCH-001** - Criar migração: tabela `users`

  **Status:** Concluído
  Tabela `user` criada via Better Auth schema Drizzle em `src/server/infrastructure/db/schema/users.ts`.
  Inclui também: `session`, `account`, `verification`. Migration `0001` aplicada.

- [x] **SCH-002** - Criar migração: FK `orders.customer_id → users.id`

  **Status:** Concluído
  FK adicionada em `src/server/infrastructure/db/schema/orders.ts`. Migration `0002` aplicada.

- [x] **SCH-003** - Criar migração: FK `events.organizer_id → users.id`

  **Status:** Concluído
  FK adicionada em `src/server/infrastructure/db/schema/events.ts`. Migration `0002` aplicada.

- [x] **SCH-004** - Adicionar campos de apresentação em `events`

  **Status:** Concluído
  Campos `description`, `location`, `imageUrl` adicionados em `events` schema. Migration `0001` aplicada.
  `EventRecord` atualizado no contrato do repositório e na implementação Drizzle.

- [x] **SCH-005** - Definir `UserRecord` e `UserRepository` contract

  **Status:** Concluído
  `UserRepository` com `findById` implementado em:
  - `src/server/repositories/user.repository.contracts.ts`
  - `src/server/repositories/drizzle/drizzle-user.repository.ts`
  Implementações adicionais `findByEmail` e `save` também disponíveis.

---

## Auth Integration — Identidade real na camada de API

### AUTH-001 - Integrar Better Auth com adapter Drizzle

- [x] **AUTH-001** - Integrar Better Auth com adapter Drizzle

  **Status:** Concluído
  `betterAuth` configurado em `src/server/infrastructure/auth/auth.config.ts` com:
  - `drizzleAdapter` usando schema Drizzle completo
  - `emailAndPassword: { enabled: true }`
  - `bearer()` plugin para suporte a Authorization Bearer
  - `advanced.database.generateId` → `crypto.randomUUID()` (garante UUIDs como IDs)
  - Campo adicional `role` (`customer` | `organizer` | `admin` | `checker`)
  - Hook `before` que bloqueia registro de `admin`/`checker` na rota pública
  - Factory `createAuth(db)` para injeção de DB nos testes

  Rotas expostas em `src/app/api/auth/[...all]/route.ts`.

### AUTH-002 - Implementar session middleware para handlers

- [x] **AUTH-002** - Implementar session middleware para handlers

  **Status:** Concluído
  Helper `getSession` implementado em `src/server/api/auth/get-session.ts`:
  - Extrai sessão via Better Auth (`auth.api.getSession`) a partir dos headers da requisição
  - Retorna `SessionContext { userId, role }`
  - Lança `createUnauthenticatedError()` se sessão inválida/ausente

  Tipo `SessionContext` definido; erro `UNAUTHENTICATED` adicionado ao mapa de erros do handler.

### AUTH-003 - Adaptar handlers existentes para sessão real

- [x] **AUTH-003** - Adaptar handlers existentes para sessão real

  **Status:** Concluído
  Todos os 6 route adapters refatorados para injetar `getSession` em deps e extrair sessão real:
  - `src/server/api/orders/create-order.route-adapter.ts`
  - `src/server/api/checkin/validate-checkin.route-adapter.ts`
  - `src/server/api/events/events.route-adapter.ts` (publish + update)
  - `src/server/api/coupons/coupons.route-adapter.ts` (create + update)

  Nenhum handler aceita mais `userId`/`role` via header arbitrário.
  Sessão inválida retorna `401 Unauthorized`.

### AUTH-004 - Testes de integração de auth

- [x] **AUTH-004** - Testes de integração de auth

  **Status:** Concluído
  Cobertura em `tests/integration/api/auth/auth.integration.test.ts`:
  - sign-up cria usuário `customer` no banco
  - sign-up cria usuário `organizer` no banco
  - sign-up bloqueia role `admin` (403 FORBIDDEN)
  - sign-up bloqueia role `checker` (403 FORBIDDEN)
  - sign-in retorna sessão com token válido
  - getSession com Bearer token resolve email e role corretos

### AUTH-005 - Regressão: RBAC policies com auth real

- [x] **AUTH-005** - Regressão: RBAC policies com auth real

  **Status:** Concluído
  Cobertura em `tests/regression/auth/rbac-session-integration.regression.test.ts`:
  - request sem sessão retorna 401
  - role do actor é extraído da sessão, não do cliente
  - `customerId` é injetado server-side; payload spoofado é ignorado

---

## Critérios de Encerramento da Fase

- [x] Tabela `users` criada com FKs em `orders` e `events`.
- [x] Schema de eventos com campos `description`, `location`, `imageUrl`.
- [x] Usuário consegue registrar, logar e manter sessão.
- [x] Todos os handlers usam identidade real da sessão.
- [x] `npm run test` passando: 255 unit + 18 regression + 357 integration = 630 total.
- [x] CHANGELOG atualizado.
- [x] `npm run lint:architecture` sem violações.
- [x] Homologação manual do fluxo auth evidenciada em 2026-03-30 (`sign-up` → `sign-in` → endpoint protegido).
