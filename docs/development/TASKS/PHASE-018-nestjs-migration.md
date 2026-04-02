---
title: Task Board — Fase 018: NestJS Backend Extraction
type: phase-task-board
mode: execution-tracking
status: draft
---

# 🚀 Tasks — Fase 018: NestJS Backend Extraction

**Status:** 🟡 Planejada
**Última atualização:** 2026-04-01
**Sprint Atual:** Sprint 018
**Modo principal:** backend
**Status Geral:** ⏳ 0% (0/20 tarefas completas) — FASE PLANEJADA
**ETA:** 2.5 semanas
**Pré-requisito:** Fase 017 — UX Polish + Pre-Migration Gate (MIGRATION-GATE.md aprovado ✅)
**Owner:** @jeandias
**Docs relacionadas:** `docs/development/SPRINTS/SPRINT-018.md`, `docs/development/MIGRATION-PLAN.md`, `docs/development/MIGRATION-GATE.md`

---

> **📌 ENTRY CONDITION:** Esta fase não pode ser iniciada sem `docs/development/MIGRATION-GATE.md` com checkbox `[x] Aprovado para Sprint 018` marcado.

---

## 📊 Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Setup Monorepo | 2 | 0 | 0 | 2 | 0 |
| Domain/Application Port | 3 | 0 | 0 | 3 | 0 |
| Controllers | 7 | 0 | 0 | 7 | 0 |
| Guards & Auth | 3 | 0 | 0 | 3 | 0 |
| Infrastructure DI | 3 | 0 | 0 | 3 | 0 |
| Tests & Deploy | 2 | 0 | 0 | 2 | 0 |
| **TOTAL** | **20** | **0** | **0** | **20** | **0** |

### 🎯 Principais Indicadores
- ⏳ Fase planejada — aguardando gate da Sprint 017
- 🔴 Dependência crítica: MIGRATION-GATE.md aprovado antes de iniciar
- 🧪 Meta: todos os 514 integration tests passando contra NestJS backend
- 📦 Entrega: `packages/backend/` rodando independente no Render

---

## 🎯 Objetivos da Fase

- Extrair backend como serviço NestJS independente em `packages/backend/` sem alterar domain/application
- Mapear todos os endpoints existentes em NestJS Controllers com Guards RBAC
- Injetar repositórios Drizzle, EmailProvider e PaymentProvider via NestJS DI
- Validar `tsc --noEmit` em isolamento no packages/backend (zero deps de Vinext/Cloudflare)
- Adaptar integration tests para rodar contra NestJS
- Deploy funcionando no Render com health check

---

## 🗺️ Dependências, Batches e Caminho Crítico

### Dependências macro
- Sprint 017 gate aprovado — MIGRATION-GATE.md com `[x] Aprovado para Sprint 018`
- Domain e application validados como portáveis (Sprint 017 GATE-001)
- `src/server/payment/` e `src/server/email/` existentes (Sprints 014–015)

### Caminho crítico
1. NEST-001 (Monorepo setup)
2. NEST-002 (NestJS bootstrap)
3. NEST-003 + NEST-004 (Domain/Application port + validação)
4. NEST-005 (Use-case providers)
5. NEST-013 (SessionGuard — bloqueante para controllers autenticados)
6. NEST-006 (EventsController — mais complexo, valida padrão)
7. NEST-019 (Integration tests)

### Paralelização possível
- NEST-007 a NEST-012 (controllers) em paralelo após NEST-005 + NEST-013
- NEST-016, NEST-017, NEST-018 (infrastructure DI) em paralelo após NEST-003
- NEST-014, NEST-015 (guards) em paralelo com controllers
- NEST-020 (deploy config) independente, pode ser feito cedo

### Checkpoints
- [ ] Discovery concluído — MIGRATION-PLAN.md revisado, monorepo estruturado
- [ ] Domain/Application portados e `tsc --noEmit` verde
- [ ] SessionGuard + RolesGuard funcionando
- [ ] Todos os controllers mapeados e respondendo
- [ ] Integration tests 514/514 passando contra NestJS

---

## 📦 Estrutura de Categorias

---

### 📦 Setup Monorepo — Estrutura base e NestJS bootstrap

#### Objetivo
Configurar o monorepo com workspaces e inicializar o projeto NestJS, garantindo que a estrutura de diretórios seja correta antes de qualquer código de negócio ser portado.

#### Escopo da categoria
- `package.json` raiz com workspaces config
- `packages/backend/` com NestJS bootstrapped (AppModule, main.ts)
- CORS, Helmet, ValidationPipe globais configurados

#### Riscos da categoria
- Conflito de versões de dependências entre workspace raiz e packages/backend
- Port 3001 pode conflitar com outro serviço local

#### Setup.1 — Configuração Inicial

- [ ] **NEST-001** — Configurar monorepo: `package.json` raiz com workspaces, `packages/backend/`, estrutura de diretórios

  **Modo recomendado:** backend
  **Tipo:** infra

  **Descrição curta:**
  - Adicionar `"workspaces": ["packages/*"]` no `package.json` raiz
  - Criar `packages/backend/` com `package.json`, `tsconfig.json` próprios
  - Configurar paths TypeScript para referências entre packages

  **Contexto mínimo:**
  - Monorepo com npm workspaces (compatível com Node 22)
  - `packages/backend/` deve ser autônomo para deploy no Render
  - Manter `src/` original do Vinext intocado durante a migração

  **Implementação sugerida:**
  - `package.json` raiz: `{ "workspaces": ["packages/*"] }`
  - `packages/backend/package.json`: deps NestJS + Drizzle + Zod + Better Auth
  - `packages/backend/tsconfig.json`: strict, moduleResolution NodeNext

  **Arquivos/áreas afetadas:** `package.json`, `packages/backend/package.json`, `packages/backend/tsconfig.json`

  **Critérios de aceitação:**
  - [ ] `npm install` na raiz instala deps de todos os workspaces
  - [ ] `packages/backend/` tem seu próprio `node_modules` resolvido corretamente
  - [ ] `packages/backend/tsconfig.json` válido sem erros

  **Estratégia de teste:**
  - [ ] Unitário: N/A
  - [ ] Integração: verificar que `packages/backend` compila sem erros
  - [ ] Regressão: `src/` original continua compilando após mudanças no raiz

  **Dependências:** Nenhuma
  **Bloqueia:** NEST-002 a NEST-020
  **Pode rodar em paralelo com:** Nenhuma

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes adicionados/atualizados
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

- [ ] **NEST-002** — NestJS bootstrapping: `AppModule`, `main.ts`, CORS, Helmet, global `ValidationPipe`

  **Modo recomendado:** backend
  **Tipo:** infra

  **Descrição curta:**
  - Criar `packages/backend/src/main.ts` com NestFactory.create
  - Configurar CORS (origin: FRONTEND_URL env), Helmet, ValidationPipe global
  - Porta: 3001 (configurável via env PORT)

  **Contexto mínimo:**
  - NestJS 10+
  - `ValidationPipe` com `whitelist: true, transform: true`
  - Helmet substitui os security headers manuais do Vinext

  **Implementação sugerida:**
  - `app.use(helmet())`
  - `app.enableCors({ origin: process.env.FRONTEND_URL })`
  - `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))`

  **Arquivos/áreas afetadas:** `packages/backend/src/main.ts`, `packages/backend/src/app.module.ts`

  **Critérios de aceitação:**
  - [ ] `cd packages/backend && npm run start:dev` sobe na porta 3001
  - [ ] `GET http://localhost:3001/api/health` responde (após NEST-004)
  - [ ] CORS configurado com `FRONTEND_URL` env

  **Estratégia de teste:**
  - [ ] Unitário: N/A (bootstrap)
  - [ ] Integração: smoke test HTTP após start

  **Dependências:** NEST-001
  **Bloqueia:** Todos os controllers e guards
  **Pode rodar em paralelo com:** NEST-016 (DatabaseModule setup parcial)

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] NestJS sobe sem erros
  - [ ] Critérios de aceitação atendidos

---

### 📦 Domain/Application Port — Zero alteração no business logic

#### Objetivo
Portar domain e application layers para packages/backend mantendo exatamente zero alterações no código de negócio. Validar portabilidade com tsc em isolamento e criar providers DI para os use-cases.

#### Escopo da categoria
- Cópia de `src/server/domain/` e `src/server/application/` para `packages/backend/src/`
- Validação `tsc --noEmit` sem deps de framework
- NestJS `@Injectable()` providers para todos os 14 use-cases

#### Riscos da categoria
- Imports relativos quebrados após cópia
- Use-case tem dependência transitiva não óbvia de Vinext

#### Domain.1 — Port e Validação

- [ ] **NEST-003** — Copiar domain + application para `packages/backend/src/` e ajustar imports

  **Modo recomendado:** backend
  **Tipo:** infra

  **Descrição curta:**
  - Copiar `src/server/domain/` → `packages/backend/src/domain/`
  - Copiar `src/server/application/` → `packages/backend/src/application/`
  - Copiar `src/server/payment/` e `src/server/email/` → `packages/backend/src/`
  - Ajustar imports relativos se necessário (não mudar lógica)

  **Contexto mínimo:**
  - Domain e application foram validados como portáveis na Sprint 017 (GATE-001)
  - Nenhuma lógica de negócio deve ser alterada
  - Apenas mudança estrutural de diretório

  **Arquivos/áreas afetadas:** `packages/backend/src/domain/`, `packages/backend/src/application/`, `packages/backend/src/payment/`, `packages/backend/src/email/`

  **Critérios de aceitação:**
  - [ ] Todos os arquivos copiados sem alteração de lógica
  - [ ] Imports relativos resolvidos corretamente

  **Estratégia de teste:**
  - [ ] Integração: NEST-004 valida com tsc

  **Dependências:** NEST-001
  **Bloqueia:** NEST-004, NEST-005
  **Pode rodar em paralelo com:** NEST-016

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Zero alteração em business logic

---

- [ ] **NEST-004** — Validar `tsc --noEmit` em isolamento — zero deps de Vinext/Cloudflare

  **Modo recomendado:** backend
  **Tipo:** test

  **Descrição curta:**
  - Executar `tsc --noEmit` no `packages/backend/`
  - Verificar que nenhum import de `vinext`, `@cloudflare/workers-types`, ou `hono` existe
  - Corrigir qualquer resíduo encontrado

  **Contexto mínimo:**
  - Se Sprint 017 GATE-001 foi executado corretamente, este passo deve ser verde imediatamente
  - Qualquer coupling encontrado aqui é um bug do gate

  **Arquivos/áreas afetadas:** `packages/backend/src/domain/`, `packages/backend/src/application/`

  **Critérios de aceitação:**
  - [ ] `cd packages/backend && tsc --noEmit` retorna exit code 0
  - [ ] `grep -r "vinext\|@cloudflare\|hono" packages/backend/src/domain packages/backend/src/application` retorna vazio

  **Estratégia de teste:**
  - [ ] Integração: comando grep + tsc são a evidência

  **Dependências:** NEST-003
  **Bloqueia:** NEST-005
  **Pode rodar em paralelo com:** NEST-016

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] `tsc --noEmit` verde
  - [ ] Zero coupling com Vinext/Cloudflare

---

- [ ] **NEST-005** — Criar NestJS providers (`@Injectable()`) para todos os 14 use-cases

  **Modo recomendado:** backend
  **Tipo:** infra

  **Descrição curta:**
  - Decorar todos os use-cases com `@Injectable()`
  - Criar `ApplicationModule` com todos use-cases no array `providers`
  - Injetar repositórios e providers (PaymentProvider, EmailProvider) via construtor

  **Contexto mínimo:**
  - Use-cases: CreateOrder, ValidateCheckin, PublishEvent, CreateEvent, UpdateEventStatus, CreateLot, UpdateLot, CreateCoupon, UpdateCoupon, ListPublishedEvents, GetEventDetail, ListEventOrders, GetCustomerOrders, GetEventAnalytics, CreateStripeCheckoutSession, ConfirmOrderPayment, CancelOrderOnPaymentFailure, SimulatePayment, SendOrderConfirmationEmail, SendEventReminderEmail

  **Arquivos/áreas afetadas:** `packages/backend/src/application/application.module.ts`

  **Critérios de aceitação:**
  - [ ] Todos os use-cases decorados com `@Injectable()`
  - [ ] `ApplicationModule` exporta todos os use-cases como providers
  - [ ] NestJS DI resolve use-cases sem erro circular

  **Estratégia de teste:**
  - [ ] Integração: `npm run start:dev` no packages/backend sem erro de DI

  **Dependências:** NEST-004, NEST-016
  **Bloqueia:** Todos os controllers
  **Pode rodar em paralelo com:** NEST-013, NEST-014, NEST-015

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] DI resolve sem circular dependency

---

### 📦 Controllers — Mapeamento de todos os endpoints

#### Objetivo
Criar NestJS Controllers que mapeiam exatamente os mesmos endpoints do Vinext, mantendo os mesmos contratos HTTP (métodos, paths, request/response shapes, status codes).

#### Escopo da categoria
- 7 controllers cobrindo todos os endpoints: events, lots, orders, checkin, coupons, webhooks, cron
- Guards aplicados via decorators

#### Riscos da categoria
- Path mismatch entre Vinext handler e NestJS controller
- Raw body parser necessário para Stripe webhook (conflito com global JSON parser)

#### Controllers.1 — API Endpoints

- [ ] **NEST-006** — `EventsController` — todos os endpoints de eventos

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - `GET /api/events` — listPublished com filtros + cursor (público)
  - `GET /api/events/:slug` — getEventDetail (público)
  - `POST /api/events` — createEvent (organizer)
  - `POST /api/events/publish` — publishEvent (organizer)
  - `PATCH /api/events/:slug/status` — updateEventStatus (organizer/admin)
  - `GET /api/events/:slug/orders` — listEventOrders (organizer/admin)
  - `GET /api/events/:slug/analytics` — getEventAnalytics (organizer/admin)

  **Arquivos/áreas afetadas:** `packages/backend/src/api/events/events.controller.ts`, `events.module.ts`

  **Critérios de aceitação:**
  - [ ] Todos os 7 endpoints respondem com os mesmos status codes do Vinext
  - [ ] Guards aplicados corretamente por endpoint
  - [ ] Zod validation via `class-validator` DTOs ou pipe customizado

  **Estratégia de teste:**
  - [ ] Integração: adaptar testes existentes de eventos para NestJS
  - [ ] Auth/AuthZ: endpoints organizer retornam 401/403 sem sessão válida

  **Dependências:** NEST-005, NEST-013
  **Bloqueia:** NEST-019
  **Pode rodar em paralelo com:** NEST-007, NEST-008, NEST-009, NEST-010

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 4h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Todos os endpoints funcionando
  - [ ] Guards aplicados
  - [ ] Integration tests passando

---

- [ ] **NEST-007** — `LotsController` — CRUD de lotes

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - `POST /api/lots` — createLot (organizer)
  - `PUT /api/lots/:id` — updateLot (organizer)

  **Arquivos/áreas afetadas:** `packages/backend/src/api/lots/lots.controller.ts`, `lots.module.ts`

  **Critérios de aceitação:**
  - [ ] Endpoints respondem igual ao Vinext
  - [ ] Auth organizer enforced

  **Estratégia de teste:**
  - [ ] Integração: adaptar tests de lots para NestJS

  **Dependências:** NEST-005, NEST-013
  **Pode rodar em paralelo com:** NEST-006, NEST-008, NEST-009, NEST-010

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Auth enforced

---

- [ ] **NEST-008** — `OrdersController` — criação e listagem de pedidos

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - `POST /api/orders` — createOrder (customer) — retorna checkoutUrl
  - `GET /api/orders/mine` — getCustomerOrders (customer)
  - `POST /api/orders/:id/simulate-payment` — simulatePayment (apenas PAYMENT_MODE=demo)

  **Arquivos/áreas afetadas:** `packages/backend/src/api/orders/orders.controller.ts`, `orders.module.ts`

  **Critérios de aceitação:**
  - [ ] Rate limiting aplicado em POST /api/orders
  - [ ] Simulate-payment bloqueado quando PAYMENT_MODE != demo
  - [ ] Customer só acessa seus próprios pedidos

  **Estratégia de teste:**
  - [ ] Integração: criar pedido + listar pedidos
  - [ ] Auth/AuthZ: sem sessão retorna 401

  **Dependências:** NEST-005, NEST-013
  **Pode rodar em paralelo com:** NEST-006, NEST-007, NEST-009, NEST-010

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Rate limiting configurado

---

- [ ] **NEST-009** — `CheckinController` — validação de ticket

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - `POST /api/checkin` — validateCheckin (checker/organizer/admin)
  - Rate limiting aplicado

  **Arquivos/áreas afetadas:** `packages/backend/src/api/checkin/checkin.controller.ts`

  **Critérios de aceitação:**
  - [ ] Checker pode validar ticket
  - [ ] Customer não pode acessar checkin endpoint

  **Estratégia de teste:**
  - [ ] Integração: checkin flow completo
  - [ ] Auth/AuthZ: role customer retorna 403

  **Dependências:** NEST-005, NEST-013
  **Pode rodar em paralelo com:** NEST-006, NEST-007, NEST-008

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] RBAC enforced

---

- [ ] **NEST-010** — `CouponsController` — criar e atualizar cupons

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - `POST /api/coupons/create` — createCoupon (organizer)
  - `POST /api/coupons/update` — updateCoupon (organizer)

  **Arquivos/áreas afetadas:** `packages/backend/src/api/coupons/coupons.controller.ts`

  **Critérios de aceitação:**
  - [ ] Organizer só cria cupons para seus próprios eventos
  - [ ] OwnershipGuard enforced

  **Estratégia de teste:**
  - [ ] Integração: criar cupom e validar em createOrder

  **Dependências:** NEST-005, NEST-013, NEST-015
  **Pode rodar em paralelo com:** NEST-006, NEST-007, NEST-008, NEST-009

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Ownership check funcionando

---

- [ ] **NEST-011** — `WebhooksController` — Stripe webhook com raw body

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - `POST /api/webhooks/stripe` — processamento de eventos Stripe
  - Requer raw body parser (não JSON global) para validação HMAC
  - Usar `rawBody: true` no NestJS ou middleware específico para o path

  **Arquivos/áreas afetadas:** `packages/backend/src/api/webhooks/webhooks.controller.ts`, configuração raw body em `main.ts`

  **Critérios de aceitação:**
  - [ ] Assinatura Stripe validada corretamente (HMAC SHA-256)
  - [ ] `checkout.session.completed` dispara ConfirmOrderPaymentUseCase
  - [ ] `payment_intent.payment_failed` dispara CancelOrderOnPaymentFailureUseCase
  - [ ] Payload inválido retorna 400 sem processar

  **Estratégia de teste:**
  - [ ] Integração: webhook com payload mockado e assinatura

  **Dependências:** NEST-005, NEST-002
  **Pode rodar em paralelo com:** NEST-006, NEST-007

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Raw body parser configurado
  - [ ] HMAC validation funcionando

---

- [ ] **NEST-012** — `CronController` — endpoint de reminders protegido por secret

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - `POST /api/cron/event-reminders` — dispara SendEventReminderEmailUseCase
  - Protegido por `CRON_SECRET` header (guard customizado)

  **Arquivos/áreas afetadas:** `packages/backend/src/api/cron/cron.controller.ts`

  **Critérios de aceitação:**
  - [ ] Request sem CRON_SECRET correto retorna 401
  - [ ] Use-case de reminder executado corretamente

  **Estratégia de teste:**
  - [ ] Integração: POST com CRON_SECRET correto e incorreto

  **Dependências:** NEST-005
  **Pode rodar em paralelo com:** outros controllers

  **Prioridade:** 🟢 Média
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Secret enforced

---

### 📦 Guards & Auth — RBAC e sessão

#### Objetivo
Implementar os três guards necessários para reproduzir o modelo de segurança do Vinext no NestJS: validação de sessão, verificação de role e verificação de ownership.

#### Escopo da categoria
- `SessionGuard`: valida Better Auth session e injeta `request.user`
- `RolesGuard`: verifica role do usuário contra `@Roles()` decorator
- `OwnershipGuard`: verifica que organizer só acessa seus próprios recursos

#### Riscos da categoria
- Better Auth API pode ter diferenças de comportamento em NestJS vs Vinext
- Circular dependency se guards injetarem repositórios

#### Auth.1 — Guards de Autenticação e Autorização

- [ ] **NEST-013** — `SessionGuard` — valida sessão Better Auth e injeta `request.user`

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - Chama `auth.api.getSession({ headers: request.headers })`
  - Se sessão inválida: throw `UnauthorizedException`
  - Se válida: `request.user = { id, role, email }`

  **Arquivos/áreas afetadas:** `packages/backend/src/auth/session.guard.ts`, `packages/backend/src/auth/auth.module.ts`

  **Critérios de aceitação:**
  - [ ] Request sem session cookie retorna 401
  - [ ] Request com session válida injeta `request.user`
  - [ ] Role do usuário disponível em `request.user.role`

  **Estratégia de teste:**
  - [ ] Integração: request autenticado e não autenticado
  - [ ] Auth/AuthZ: sessão expirada retorna 401

  **Dependências:** NEST-002, NEST-003
  **Bloqueia:** NEST-014, NEST-015, todos controllers autenticados
  **Pode rodar em paralelo com:** NEST-005

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Guard implementado
  - [ ] Tests de sessão passando

---

- [ ] **NEST-014** — `RolesGuard` — valida role contra decorator `@Roles(...)`

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - Decorator: `@Roles('organizer', 'admin')`
  - Guard lê `request.user.role` e compara com roles permitidos
  - Se role não autorizado: throw `ForbiddenException`

  **Arquivos/áreas afetadas:** `packages/backend/src/auth/roles.guard.ts`, `packages/backend/src/auth/roles.decorator.ts`

  **Critérios de aceitação:**
  - [ ] Customer tentando endpoint organizer recebe 403
  - [ ] Admin tem acesso a todos os endpoints organizer
  - [ ] Checker só acessa endpoints de checkin

  **Estratégia de teste:**
  - [ ] Auth/AuthZ: matriz de roles por endpoint

  **Dependências:** NEST-013
  **Pode rodar em paralelo com:** NEST-015, controllers

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Guard implementado
  - [ ] Todos os 4 roles testados

---

- [ ] **NEST-015** — `OwnershipGuard` — organizer só acessa seus próprios eventos/coupons

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - Para endpoints de eventos/lotes/cupons: verifica `event.organizerId === request.user.id`
  - Se ownership inválido: throw `ForbiddenException`
  - Admin bypassa ownership check

  **Arquivos/áreas afetadas:** `packages/backend/src/auth/ownership.guard.ts`

  **Critérios de aceitação:**
  - [ ] Organizer A não pode acessar evento do Organizer B
  - [ ] Admin pode acessar qualquer evento
  - [ ] Ownership check usa `EventRepository.findById`

  **Estratégia de teste:**
  - [ ] Integração: organizer tenta acessar evento alheio

  **Dependências:** NEST-013, NEST-016
  **Pode rodar em paralelo com:** NEST-014

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Ownership enforced
  - [ ] Admin bypass funcionando

---

### 📦 Infrastructure DI — Módulos de infraestrutura

#### Objetivo
Criar os módulos NestJS para Database (Drizzle + repositórios), Email (ResendEmailProvider) e Payment (StripePaymentProvider), tornando-os injetáveis nos use-cases via DI.

#### Escopo da categoria
- `DatabaseModule` com todos os repositórios Drizzle como providers
- `EmailModule` com ResendEmailProvider
- `PaymentModule` com StripePaymentProvider

#### Riscos da categoria
- Drizzle pool de conexões pode conflitar com NestJS lifecycle
- Circular dependency entre módulos

#### Infrastructure.1 — Módulos de Serviço

- [ ] **NEST-016** — `DatabaseModule` com Drizzle e todos os repositórios

  **Modo recomendado:** backend
  **Tipo:** infra

  **Descrição curta:**
  - Copiar `src/server/repositories/drizzle/` para `packages/backend/src/repositories/`
  - Criar `DatabaseModule` que fornece: EventRepository, LotRepository, OrderRepository, TicketRepository, CouponRepository, UserRepository
  - Drizzle pool configurado via `DATABASE_URL` env

  **Arquivos/áreas afetadas:** `packages/backend/src/infrastructure/database/database.module.ts`, `packages/backend/src/repositories/`

  **Critérios de aceitação:**
  - [ ] Todos os 6 repositórios disponíveis como providers no DI
  - [ ] Conexão Neon funciona com `DATABASE_URL`
  - [ ] Pool do Drizzle fecha corretamente no shutdown do NestJS

  **Estratégia de teste:**
  - [ ] Integração: query simples ao banco após bootstrap

  **Dependências:** NEST-001, NEST-003
  **Bloqueia:** NEST-005, NEST-015
  **Pode rodar em paralelo com:** NEST-002, NEST-004

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] DatabaseModule funcionando
  - [ ] Pool fecha no shutdown

---

- [ ] **NEST-017** — `EmailModule` com `ResendEmailProvider`

  **Modo recomendado:** backend
  **Tipo:** infra

  **Descrição curta:**
  - `EmailModule` com `ResendEmailProvider` como provider usando token `EMAIL_PROVIDER`
  - `RESEND_API_KEY` e `EMAIL_FROM` via env
  - Exportar `EMAIL_PROVIDER` para uso nos use-cases

  **Arquivos/áreas afetadas:** `packages/backend/src/email/email.module.ts`

  **Critérios de aceitação:**
  - [ ] `SendOrderConfirmationEmailUseCase` injeta `EmailProvider` corretamente
  - [ ] Provider resolve via DI sem erro

  **Estratégia de teste:**
  - [ ] Integração: use-case de email com provider mockado

  **Dependências:** NEST-003
  **Pode rodar em paralelo com:** NEST-016, NEST-018

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] DI resolve corretamente

---

- [ ] **NEST-018** — `PaymentModule` com `StripePaymentProvider`

  **Modo recomendado:** backend
  **Tipo:** infra

  **Descrição curta:**
  - `PaymentModule` com `StripePaymentProvider` como provider usando token `PAYMENT_PROVIDER`
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENT_MODE` via env
  - Exportar `PAYMENT_PROVIDER` para uso nos use-cases

  **Arquivos/áreas afetadas:** `packages/backend/src/payment/payment.module.ts`

  **Critérios de aceitação:**
  - [ ] `CreateStripeCheckoutSessionUseCase` injeta `PaymentProvider` corretamente
  - [ ] Provider resolve via DI

  **Estratégia de teste:**
  - [ ] Integração: use-case de pagamento com provider mockado

  **Dependências:** NEST-003
  **Pode rodar em paralelo com:** NEST-016, NEST-017

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] DI resolve corretamente

---

### 📦 Tests & Deploy — Validação e configuração de deploy

#### Objetivo
Adaptar os integration tests existentes para rodar contra o NestJS backend e configurar o deploy no Render.

#### Escopo da categoria
- 18 arquivos de integration tests adaptados para NestJS
- `render.yaml` com configuração de deploy

#### Riscos da categoria
- Tests podem depender de handler internals do Vinext
- Render pode ter limitações de plano free que afetam cold start

- [ ] **NEST-019** — Adaptar todos os integration tests para rodar contra NestJS

  **Modo recomendado:** backend
  **Tipo:** test

  **Descrição curta:**
  - Substituir chamadas diretas a handler functions por HTTP requests ao NestJS (supertest)
  - Garantir que os 514 integration tests passam 100% contra NestJS
  - Criar NestJS testing module helpers (`createTestingApp()`)

  **Arquivos/áreas afetadas:** `tests/integration/` (18 arquivos)

  **Critérios de aceitação:**
  - [ ] `npm run test:integration` passa 514/514 contra NestJS
  - [ ] Nenhum test usa handler internals do Vinext
  - [ ] Test setup cria e destrói NestJS app por arquivo de teste

  **Estratégia de teste:**
  - [ ] Integração: esta task É os testes de integração

  **Dependências:** NEST-006 a NEST-015
  **Bloqueia:** Sprint 019
  **Pode rodar em paralelo com:** NEST-020

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 4h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] 514/514 testes passando
  - [ ] Zero referencias a Vinext nos testes

---

- [ ] **NEST-020** — Deploy config: `render.yaml` e variáveis de ambiente template

  **Modo recomendado:** backend
  **Tipo:** infra

  **Descrição curta:**
  - `packages/backend/render.yaml` com buildCommand e startCommand
  - `packages/backend/.env.example` com todas as env vars necessárias
  - Health check path: `/api/health` (implementado em NEST-004 context)

  **Arquivos/áreas afetadas:** `packages/backend/render.yaml`, `packages/backend/.env.example`

  **Critérios de aceitação:**
  - [ ] Render deploya o backend com `npm run build && npm run start:prod`
  - [ ] Health check `/api/health` responde 200 após deploy
  - [ ] Todas as env vars documentadas no `.env.example`

  **Estratégia de teste:**
  - [ ] Integração: deploy manual no Render e smoke test HTTP

  **Dependências:** NEST-002
  **Pode rodar em paralelo com:** NEST-019

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Deploy funcionando no Render
  - [ ] Health check OK

---

## 🧪 Testes e Validações

- **Suites necessárias:** Vitest (unit + integration), supertest para NestJS
- **Cobertura alvo:** 514/514 integration tests passando + tsc --noEmit verde
- **Comandos de verificação:**
  - `cd packages/backend && tsc --noEmit`
  - `npm run test:integration`
  - `grep -r "vinext\|@cloudflare" packages/backend/src/domain packages/backend/src/application`
  - `curl http://localhost:3001/api/health`
- **Estado atual:** ⏳ Pendente — fase não iniciada
- **Fluxos críticos a validar manualmente:**
  - Compra completa: POST /api/orders → webhook Stripe → GET /api/orders/mine (tickets ativos)
  - Check-in: POST /api/checkin com ticket code válido
  - Admin: criar evento → publicar → listar pedidos

---

## 🔍 Riscos, Bloqueios e Decisões

### Bloqueios atuais
- Sprint 018 não pode iniciar sem MIGRATION-GATE.md aprovado (Sprint 017)

### Riscos em aberto
- Raw body parser para Stripe webhook pode conflitar com global JSON parser do NestJS — mitigar com middleware no path específico
- Drizzle pool de conexões WebSocket pode ter comportamento diferente em NestJS lifecycle (vs Cloudflare Workers edge runtime)
- Better Auth pode exigir ajuste de configuração para funcionar fora do Vinext runtime

### Decisões importantes
- Usar npm workspaces (não Turborepo/Nx) para manter simplicidade
- `packages/backend/` totalmente autônomo — pode ser deployado sem a raiz do monorepo
- NestJS porta 3001 (Vinext continua em 3000 durante coexistência)

---

## 📚 Documentação e Comunicação

- [ ] Atualizar `docs/development/TASKS.md` com Fase 018
- [ ] Atualizar `docs/development/CHANGELOG.md`
- [ ] Atualizar `docs/development/ROADMAP.md` com status da Fase 14
- [ ] Registrar decisão de monorepo no MIGRATION-PLAN.md
- [ ] Criar `packages/backend/README.md` com setup local e deploy instructions

---

## ✅ Checklist de Encerramento da Fase

- [ ] Todas as 20 tarefas críticas concluídas
- [ ] `tsc --noEmit` verde em packages/backend isolado
- [ ] Zero acoplamentos de Vinext/Cloudflare no domain/application portados
- [ ] 514/514 integration tests passando contra NestJS
- [ ] NestJS respondendo no Render com health check OK
- [ ] RBAC testado: todos os 4 roles (customer/organizer/admin/checker)
- [ ] Stripe webhook funcionando com assinatura HMAC válida
- [ ] Documentação atualizada (CHANGELOG, ROADMAP, TASKS)
- [ ] Aprovação final registrada
- [ ] GOV closure criado em `docs/development/Logs/GOV-XXX-phase-018.md`
- [ ] Changelog atualizado

---

## 📌 Instrução padrão para AGENTS.md

```text
When generating or updating phase/sprint task boards for this application, always follow the official Task Board Template.

Rules:
- this file is the operational tracking source for a phase or sprint
- do not use it as a single-task template
- every task entry must include acceptance criteria, dependencies, status, and test strategy
- identify critical path and parallelizable work whenever possible
- keep the board specific to the current phase, sprint, and architecture
- update progress consistently and avoid generic placeholders in final project documents
- preserve historical notes for completed or archived tasks
```
