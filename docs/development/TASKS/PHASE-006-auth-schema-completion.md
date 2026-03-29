# 🚀 Tasks - Fase 006: Auth Integration & Schema Completion

**Status:** 🔵 PLANEJADA
**Última atualização:** 2026-03-29
**Sprint Atual:** Sprint 006
**Status Geral:** 🔵 0% (0/10 tarefas completas)
**ETA:** 1 sprint
**Pré-requisito:** Fase 005 (concluída)

---

## 📊 Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Schema & Migrations | 5 | 0 | 0 | 5 | 0 |
| Auth Integration | 5 | 0 | 0 | 5 | 0 |
| **TOTAL** | **10** | **0** | **0** | **10** | **0** |

### 🎯 Principais Indicadores
- 🔴 Bloqueante crítico: `users` table ausente no schema — FKs de `customer_id` e `organizer_id` sem enforcement.
- 🔴 Auth é placeholder: handlers recebem `userId`/`role` injetados sem validação de sessão real.
- ⚠️ Esta fase é precondição para: checkout real, "meus ingressos", admin operacional com identidade.

---

## 🎯 Objetivos da Fase

- Criar tabela `users` com campos de role e adicionar FKs de referência nas tabelas existentes.
- Completar schema de eventos com campos de apresentação (`description`, `location`, `imageUrl`).
- Integrar biblioteca de auth real (Better Auth ou Auth.js com adapter Drizzle).
- Implementar session middleware para extrair `userId`/`role` da sessão em todos os handlers.
- Adaptar handlers existentes para usar identidade real da sessão em vez de mocks.
- Cobrir autenticação com testes de integração e regressão de RBAC.

---

## 📦 Estrutura de Categorias

### 📦 Schema & Migrations — Completar modelo de dados

#### Objetivo
Fechar o gap de integridade referencial e adicionar campos necessários para as UIs de apresentação.

#### SCH.1 - Tabela users e FKs

- [ ] **SCH-001** - Criar migração: tabela `users`

  **Descrição curta:**
  - Criar tabela `users` com campos: `id` (uuid PK), `email` (text unique not null), `role` (enum: customer/organizer/admin/checker), `created_at`, `updated_at`.
  - Definir enum `user_role` no Drizzle.

  **Implementação sugerida:**
  - `src/server/infrastructure/db/schema/users.ts`
  - `drizzle-kit generate` + `drizzle-kit migrate`

  **Arquivos/áreas afetadas:** `src/server/infrastructure/db/schema/users.ts`, `src/server/infrastructure/db/schema/index.ts`

  **Critérios de aceitação:**
  - [ ] Tabela `users` criada com migration aplicável.
  - [ ] Enum `user_role` definido com os 4 papéis do AGENTS.md.
  - [ ] Teste de integração de schema confirma estrutura.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Dependências:** —
  **Status:** ⏳ Pendente

- [ ] **SCH-002** - Criar migração: FK `orders.customer_id → users.id`

  **Descrição curta:**
  - Adicionar constraint de FK para garantir integridade referencial de pedidos.

  **Implementação sugerida:**
  - Migration Drizzle para adicionar FK em `orders` tabela.
  - Atualizar schema definition em `orders.ts`.

  **Arquivos/áreas afetadas:** `src/server/infrastructure/db/schema/orders.ts`

  **Critérios de aceitação:**
  - [ ] FK aplicada sem quebrar testes existentes.
  - [ ] Migration reversível documentada.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Dependências:** SCH-001
  **Status:** ⏳ Pendente

- [ ] **SCH-003** - Criar migração: FK `events.organizer_id → users.id`

  **Descrição curta:**
  - Adicionar constraint de FK para garantir integridade referencial de eventos.

  **Implementação sugerida:**
  - Migration Drizzle para adicionar FK em `events` tabela.
  - Atualizar schema definition em `events.ts`.

  **Arquivos/áreas afetadas:** `src/server/infrastructure/db/schema/events.ts`

  **Critérios de aceitação:**
  - [ ] FK aplicada sem quebrar testes existentes.
  - [ ] Fixtures de teste atualizadas para usar user IDs reais.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Dependências:** SCH-001
  **Status:** ⏳ Pendente

- [ ] **SCH-004** - Adicionar campos de apresentação em `events`

  **Descrição curta:**
  - Adicionar `description` (text, nullable), `location` (text, nullable), `image_url` (text, nullable) à tabela de eventos.
  - Estes campos são necessários para event detail page (Phase 007).

  **Implementação sugerida:**
  - Migration Drizzle para `ALTER TABLE events ADD COLUMN ...`.
  - Atualizar `EventRecord` no contrato do repositório.
  - Atualizar `drizzle-event.repository.ts` para incluir campos novos no select.

  **Arquivos/áreas afetadas:** `src/server/infrastructure/db/schema/events.ts`, `src/server/repositories/event.repository.contracts.ts`, `src/server/repositories/drizzle/drizzle-event.repository.ts`

  **Critérios de aceitação:**
  - [ ] Campos disponíveis no schema e nos records do repositório.
  - [ ] Migrations passam sem conflito com dados existentes.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h30
  **Dependências:** —
  **Status:** ⏳ Pendente

- [ ] **SCH-005** - Definir `UserRecord` e `UserRepository` contract

  **Descrição curta:**
  - Definir `UserRecord` (id, email, role, createdAt).
  - Definir `UserRepository` contract com `findById`, `findByEmail`, `save`.
  - Implementar `DrizzleUserRepository`.

  **Implementação sugerida:**
  - `src/server/repositories/user.repository.contracts.ts`
  - `src/server/repositories/drizzle/drizzle-user.repository.ts`

  **Arquivos/áreas afetadas:** `src/server/repositories/`, `src/server/repositories/drizzle/`

  **Critérios de aceitação:**
  - [ ] Contract definido com tipos explícitos.
  - [ ] Implementação Drizzle com testes de integração.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 3h
  **Dependências:** SCH-001
  **Status:** ⏳ Pendente

---

### 📦 Auth Integration — Identidade real na camada de API

#### Objetivo
Integrar biblioteca de autenticação real, implementar extração de sessão nos handlers e adaptar RBAC existente para usar identidade de sessão.

#### AUTH.1 - Integração e middleware

- [ ] **AUTH-001** - Integrar Better Auth com adapter Drizzle

  **Descrição curta:**
  - Instalar e configurar Better Auth (ou Auth.js) com adapter para Drizzle.
  - Configurar rotas de auth (`/api/auth/*`).
  - Integrar com tabela `users` criada em SCH-001.

  **Implementação sugerida:**
  - `src/server/infrastructure/auth/auth.config.ts`
  - Rotas em `src/app/api/auth/[...all]/route.ts`
  - Adaptar `src/server/infrastructure/db/client.ts` para suporte ao adapter.

  **Arquivos/áreas afetadas:** `src/server/infrastructure/auth/`, `src/app/api/auth/`

  **Critérios de aceitação:**
  - [ ] Usuário consegue registrar e logar via `/api/auth`.
  - [ ] Sessão armazenada e recuperável.
  - [ ] Rotas de auth documentadas no README do server.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 5h
  **Dependências:** SCH-001, SCH-005
  **Status:** ⏳ Pendente

- [ ] **AUTH-002** - Implementar session middleware para handlers

  **Descrição curta:**
  - Criar utilitário para extrair `userId` e `role` da sessão em handlers.
  - Substituir injeção manual por extração real de sessão.

  **Implementação sugerida:**
  - `src/server/api/auth/get-session.ts` — helper para extrair sessão
  - Definir tipo `SessionContext` (userId, role)
  - Integrar com todos os route adapters existentes

  **Arquivos/áreas afetadas:** `src/server/api/`, todos os `*.route-adapter.ts`

  **Critérios de aceitação:**
  - [ ] Handlers não aceitam mais `userId`/`role` via body/header arbitrário.
  - [ ] Sessão inválida resulta em `401 Unauthorized`.
  - [ ] Testes existentes adaptados para sessão mockada corretamente.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 4h
  **Dependências:** AUTH-001
  **Status:** ⏳ Pendente

- [ ] **AUTH-003** - Adaptar handlers existentes para sessão real

  **Descrição curta:**
  - Refatorar todos os 6 handlers existentes para usar `getSession()` real.
  - Garantir que nenhum handler depende de identidade injetada externamente.

  **Implementação sugerida:**
  - Revisar: `create-order.handler.ts`, `validate-checkin.handler.ts`, `publish-event.handler.ts`, `update-event.handler.ts`, `create-coupon.handler.ts`, `update-coupon.handler.ts`
  - Cada handler deve extrair sessão via `AUTH-002` middleware

  **Arquivos/áreas afetadas:** `src/server/api/orders/`, `src/server/api/checkin/`, `src/server/api/events/`, `src/server/api/coupons/`

  **Critérios de aceitação:**
  - [ ] Todos os handlers validam sessão real.
  - [ ] `401` retornado para requisições sem sessão válida.
  - [ ] Testes de handler atualizados (mocks de sessão corretos).

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Dependências:** AUTH-002
  **Status:** ⏳ Pendente

- [ ] **AUTH-004** - Testes de integração de auth

  **Descrição curta:**
  - Cobrir fluxo de login, sessão e extração de role em testes de integração.

  **Implementação sugerida:**
  - `tests/integration/api/auth/login.integration.test.ts`
  - `tests/integration/api/auth/session.integration.test.ts`

  **Arquivos/áreas afetadas:** `tests/integration/api/auth/`

  **Critérios de aceitação:**
  - [ ] Teste de login retorna sessão válida.
  - [ ] Teste de sessão inválida retorna 401.
  - [ ] Role correto extraído da sessão.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 3h
  **Dependências:** AUTH-001, AUTH-002
  **Status:** ⏳ Pendente

- [ ] **AUTH-005** - Regressão: RBAC policies com auth real

  **Descrição curta:**
  - Garantir que todas as políticas de RBAC (ownership, checkin-access, create-order) continuam funcionando com identidade real.

  **Implementação sugerida:**
  - Atualizar `tests/integration/api/*/auth.test.ts` para usar sessão real em vez de payload mockado.
  - Rodar suite de regressão completa.

  **Arquivos/áreas afetadas:** `tests/integration/api/`, `tests/regression/`

  **Critérios de aceitação:**
  - [ ] Todos os testes de autorização passando com sessão real.
  - [ ] Nenhuma regressão introduzida nos fluxos de compra, checkin e evento.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Dependências:** AUTH-003
  **Status:** ⏳ Pendente

---

## ✅ Critérios de Encerramento da Fase

- [ ] Tabela `users` criada com FKs em `orders` e `events`.
- [ ] Schema de eventos com campos `description`, `location`, `imageUrl`.
- [ ] Usuário consegue registrar, logar e manter sessão.
- [ ] Todos os handlers usam identidade real da sessão.
- [ ] `npm run test` passando (unit + regression + integration).
- [ ] `npm run lint:architecture` sem violações.
- [ ] GOV doc de encerramento criado.
- [ ] CHANGELOG atualizado.
