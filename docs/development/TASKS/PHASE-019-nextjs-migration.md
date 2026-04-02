---
title: Task Board — Fase 019: Next.js Frontend Migration
type: phase-task-board
mode: execution-tracking
status: draft
---

# 🚀 Tasks — Fase 019: Next.js Frontend Migration

**Status:** 🟡 Planejada
**Última atualização:** 2026-04-01
**Sprint Atual:** Sprint 019
**Modo principal:** frontend
**Status Geral:** ⏳ 0% (0/19 tarefas completas) — FASE PLANEJADA
**ETA:** 2 semanas
**Pré-requisito:** Fase 018 — NestJS Backend Extraction ✅ (NestJS rodando no Railway)
**Owner:** @jeandias
**Docs relacionadas:** `docs/development/SPRINTS/SPRINT-019.md`, `docs/development/MIGRATION-PLAN.md`

---

## 📊 Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Setup | 3 | 0 | 0 | 3 | 0 |
| Pages Migration | 7 | 0 | 0 | 7 | 0 |
| Server Actions | 4 | 0 | 0 | 4 | 0 |
| Auth | 2 | 0 | 0 | 2 | 0 |
| Deploy | 3 | 0 | 0 | 3 | 0 |
| **TOTAL** | **19** | **0** | **0** | **19** | **0** |

### 🎯 Principais Indicadores
- ⏳ Fase planejada — aguardando Sprint 018
- 🔴 Dependência: NestJS backend no Railway com URL configurada
- 🧪 Meta: smoke tests 100% no stack Next.js + NestJS integrado
- 📦 Entrega: `packages/web/` deployado no Vercel

---

## 🎯 Objetivos da Fase

- Migrar frontend de Vinext para Next.js 15 App Router em `packages/web/`
- Migrar todas as 9 rotas (home, evento, checkout, meus-ingressos, admin, checkin, login)
- Criar `lib/api-client.ts` apontando para NestJS backend no Railway
- Implementar Server Actions para todas as mutações (createOrder, checkinTicket, createEvent, createLot)
- Integrar Better Auth com Next.js usando cookies HttpOnly
- Deploy no Vercel com E2E smoke tests passando

---

## 🗺️ Dependências, Batches e Caminho Crítico

### Dependências macro
- Sprint 018 completa: NestJS rodando no Railway com URL conhecida
- `NEXT_PUBLIC_API_URL` configurada (Railway URL)
- Better Auth funciona com Next.js cookies (verificar no spike NEXT-015)

### Caminho crítico
1. NEXT-001 (Next.js scaffolding)
2. NEXT-002 (Tailwind + shadcn/ui)
3. NEXT-003 (API client)
4. NEXT-015 (Better Auth Next.js adapter) — bloqueante para pages autenticadas
5. NEXT-016 (Middleware proteção de rotas)
6. NEXT-004 (Home page — mais complexa por busca/filtros)
7. NEXT-019 (E2E smoke tests)

### Paralelização possível
- NEXT-005, NEXT-006, NEXT-007, NEXT-008, NEXT-009, NEXT-010 (pages) em paralelo após NEXT-003 + NEXT-015
- NEXT-011, NEXT-012, NEXT-013, NEXT-014 (server actions) em paralelo com pages
- NEXT-017, NEXT-018 (deploy config) independente, pode ser feito cedo

### Checkpoints
- [ ] Next.js + shadcn/ui rodando localmente
- [ ] API client conectado ao NestJS
- [ ] Better Auth funcionando com cookies
- [ ] Todas as 9 rotas migradas e funcionando
- [ ] E2E smoke tests 100% no Vercel + Railway

---

## 📦 Estrutura de Categorias

---

### 📦 Setup — Scaffolding e configuração base

#### Objetivo
Criar o projeto Next.js 15 com App Router, configurar Tailwind 4 + shadcn/ui e criar o API client que conecta ao NestJS backend.

#### Escopo da categoria
- `packages/web/` com Next.js 15
- Tailwind + shadcn/ui configurados
- `lib/api-client.ts` com fetch para NestJS

#### Riscos da categoria
- Tailwind 4 tem breaking changes vs Tailwind 3 (usado no Vinext)
- shadcn/ui pode exigir ajustes de configuração para Next.js 15

#### Setup.1 — Projeto Base

- [ ] **NEXT-001** — Next.js 15 scaffolding em `packages/web/` com App Router, TypeScript strict

  **Modo recomendado:** frontend
  **Tipo:** infra

  **Descrição curta:**
  - `create-next-app@15 packages/web --typescript --app --src-dir`
  - Adicionar `packages/web` ao workspaces do `package.json` raiz
  - `tsconfig.json` strict com `moduleResolution: bundler`

  **Arquivos/áreas afetadas:** `packages/web/`, `package.json` (raiz)

  **Critérios de aceitação:**
  - [ ] `cd packages/web && npm run dev` sobe na porta 3000
  - [ ] TypeScript strict sem erros no template
  - [ ] Hot module replacement funcionando

  **Estratégia de teste:**
  - [ ] Integração: `npm run build` sem erros

  **Dependências:** NEST-001 (monorepo setup)
  **Bloqueia:** NEXT-002 a NEXT-019
  **Pode rodar em paralelo com:** Nenhuma

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Projeto criado e rodando

---

- [ ] **NEXT-002** — Tailwind 4 + shadcn/ui configurados em `packages/web/`

  **Modo recomendado:** frontend
  **Tipo:** infra

  **Descrição curta:**
  - Instalar Tailwind 4 + PostCSS no `packages/web/`
  - Inicializar shadcn/ui: `npx shadcn@latest init`
  - Migrar `globals.css` e tokens de cor do Vinext para o novo projeto

  **Arquivos/áreas afetadas:** `packages/web/src/app/globals.css`, `packages/web/tailwind.config.ts`, `packages/web/components.json`

  **Critérios de aceitação:**
  - [ ] Componentes shadcn/ui renderizam corretamente
  - [ ] Tailwind classes aplicadas no `npm run dev`
  - [ ] Tokens de cor consistentes com o design do Vinext

  **Estratégia de teste:**
  - [ ] Manual: visual check dos componentes shadcn/ui

  **Dependências:** NEXT-001
  **Bloqueia:** NEXT-004 a NEXT-010
  **Pode rodar em paralelo com:** NEXT-015

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] shadcn/ui funcionando

---

- [ ] **NEXT-003** — `lib/api-client.ts` — wrapper fetch para NestJS com auth header

  **Modo recomendado:** frontend
  **Tipo:** infra

  **Descrição curta:**
  - Funções tipadas para todos os endpoints: `getEvents(params)`, `getEventDetail(slug)`, `createOrder(data)`, etc.
  - Server-side: inclui Authorization header com session token do Better Auth
  - Client-side: inclui credentials (cookies)
  - `NEXT_PUBLIC_API_URL` env para URL do Railway

  **Arquivos/áreas afetadas:** `packages/web/src/lib/api-client.ts`

  **Critérios de aceitação:**
  - [ ] `getEvents()` retorna lista de eventos do NestJS
  - [ ] Requests autenticados incluem Authorization header
  - [ ] Erros HTTP mapeados para AppError types

  **Estratégia de teste:**
  - [ ] Integração: `getEvents()` retorna dados reais do NestJS em staging

  **Dependências:** NEXT-001
  **Bloqueia:** NEXT-004 a NEXT-010
  **Pode rodar em paralelo com:** NEXT-015

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Todas as funções tipadas implementadas
  - [ ] Testes de integração passando

---

### 📦 Pages Migration — Migração de todas as rotas

#### Objetivo
Migrar as 9 rotas existentes do Vinext para Next.js App Router, usando Server Components para fetch de dados e Client Components para interatividade.

#### Escopo da categoria
- 9 rotas migradas: `/`, `/eventos/[slug]`, `/checkout/*`, `/meus-ingressos`, `/admin`, `/checkin`, `/login`
- Padrão: Server Component para dados + Client Component para interação

#### Riscos da categoria
- `CheckoutForm` tem estado complexo (lot selection + coupon) — migração pode ser trabalhosa
- Admin dashboard tem múltiplas abas — estrutura pode mudar

#### Pages.1 — Rotas Públicas e Autenticadas

- [ ] **NEXT-004** — Home page `/` — listagem de eventos com search + filtros

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Server Component: busca inicial de eventos via `getEvents()` (SSR)
  - Client Component: `EventSearch` com debounce 300ms + URL search params
  - Filtros: data, localização, categoria via URL params
  - Infinite scroll / "Carregar mais" com cursor pagination

  **Arquivos/áreas afetadas:** `packages/web/src/app/page.tsx`, `packages/web/src/features/events/`

  **Critérios de aceitação:**
  - [ ] Eventos carregam via SSR na primeira visita
  - [ ] Search bar filtra eventos em < 500ms (após debounce)
  - [ ] Cursor pagination funciona ("Carregar mais")

  **Estratégia de teste:**
  - [ ] Integração: `npm run build` sem erros
  - [ ] E2E: smoke test acessa `/` e lista eventos

  **Dependências:** NEXT-002, NEXT-003
  **Pode rodar em paralelo com:** NEXT-005, NEXT-006

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] SSR funcionando
  - [ ] Search + filtros funcionando

---

- [ ] **NEXT-005** — `/eventos/[slug]` — detalhe do evento + lot selector + botão checkout

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Server Component: carrega evento + lotes ativos via `getEventDetail(slug)`
  - Client Component: `LotSelector` para seleção de quantidade por lote
  - Botão "Comprar": chama `createOrder` Server Action

  **Arquivos/áreas afetadas:** `packages/web/src/app/eventos/[slug]/page.tsx`, `packages/web/src/features/checkout/lot-selector.tsx`

  **Critérios de aceitação:**
  - [ ] Evento carrega via SSR
  - [ ] LotSelector atualiza quantidade corretamente
  - [ ] Botão "Comprar" cria pedido e redireciona para Stripe

  **Estratégia de teste:**
  - [ ] E2E: acessa evento → seleciona lote → cria pedido

  **Dependências:** NEXT-002, NEXT-003, NEXT-015, NEXT-011
  **Pode rodar em paralelo com:** NEXT-004, NEXT-006

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Fluxo de compra funcionando

---

- [ ] **NEXT-006** — `/checkout/success` e `/checkout/cancel` — retorno do Stripe

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - `/checkout/success`: mostra mensagem de sucesso + link para "/meus-ingressos"
  - `/checkout/cancel`: mostra mensagem de cancelamento + link para voltar ao evento
  - Ambas leem `session_id` do query param para referência

  **Arquivos/áreas afetadas:** `packages/web/src/app/checkout/success/page.tsx`, `packages/web/src/app/checkout/cancel/page.tsx`

  **Critérios de aceitação:**
  - [ ] Páginas renderizam corretamente após retorno do Stripe
  - [ ] Links de navegação funcionam

  **Estratégia de teste:**
  - [ ] Manual: visitar URL com session_id mockado

  **Dependências:** NEXT-002
  **Pode rodar em paralelo com:** outras pages

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Páginas funcionando

---

- [ ] **NEXT-007** — `/meus-ingressos` — tickets com QR codes

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Server Component: busca pedidos + tickets via `getCustomerOrders()` (autenticado)
  - Migrar componente `TicketQR` para packages/web
  - Skeleton screen durante loading
  - Redirecionar para /login se não autenticado (via middleware)

  **Arquivos/áreas afetadas:** `packages/web/src/app/meus-ingressos/page.tsx`, `packages/web/src/features/tickets/ticket-qr.tsx`

  **Critérios de aceitação:**
  - [ ] Tickets do cliente listados com QR code inline
  - [ ] Sem autenticação: redirect para /login
  - [ ] Skeleton renderiza durante fetch

  **Estratégia de teste:**
  - [ ] Auth/AuthZ: sem sessão → redirect /login
  - [ ] E2E: smoke test visualiza tickets após compra

  **Dependências:** NEXT-003, NEXT-015, NEXT-016
  **Pode rodar em paralelo com:** NEXT-004, NEXT-005, NEXT-008

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] QR codes renderizando
  - [ ] Auth redirect funcionando

---

- [ ] **NEXT-008** — `/admin` — dashboard organizer/admin completo

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Server Component: carrega eventos do organizer
  - Client Components: formulários de criar evento, criar lote, visualizar pedidos, painel de métricas
  - Migrar `AdminManagementForm` e `AnalyticsPanel` do Vinext
  - Protected: apenas organizer e admin

  **Arquivos/áreas afetadas:** `packages/web/src/app/admin/page.tsx`, `packages/web/src/features/admin/`

  **Critérios de aceitação:**
  - [ ] Criar evento funciona via Server Action
  - [ ] Criar lote funciona via Server Action
  - [ ] Pedidos listados por evento
  - [ ] Métricas exibidas (receita, ocupação, cupons)
  - [ ] Customer vê 403

  **Estratégia de teste:**
  - [ ] Auth/AuthZ: customer retorna 403
  - [ ] E2E: smoke test cria evento e lote no admin

  **Dependências:** NEXT-003, NEXT-013, NEXT-014, NEXT-015, NEXT-016
  **Pode rodar em paralelo com:** NEXT-004, NEXT-007

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 4h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Admin completo funcionando

---

- [ ] **NEXT-009** — `/checkin` — scanner QR via câmera + input manual

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Migrar `CheckinForm` e `QrScanner` (da Sprint 017) para packages/web
  - Camera QR scanner via MediaDevices API
  - Fallback: input manual
  - Server Action `checkinTicket` chama NestJS

  **Arquivos/áreas afetadas:** `packages/web/src/app/checkin/page.tsx`, `packages/web/src/features/checkin/`

  **Critérios de aceitação:**
  - [ ] Camera QR scanner funcionando (com permissão)
  - [ ] Fallback input manual funcionando
  - [ ] Check-in realizado via NestJS
  - [ ] Protected: apenas checker/organizer/admin

  **Estratégia de teste:**
  - [ ] E2E: smoke test do check-in com código manual

  **Dependências:** NEXT-003, NEXT-012, NEXT-015, NEXT-016
  **Pode rodar em paralelo com:** NEXT-004, NEXT-007, NEXT-008

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Check-in funcionando

---

- [ ] **NEXT-010** — `/login` — Better Auth sign-in/sign-up

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Migrar `LoginForm` do Vinext
  - Better Auth client-side com Next.js
  - Após login: redirect para página anterior ou /meus-ingressos
  - Após sign-up: redirect para /meus-ingressos

  **Arquivos/áreas afetadas:** `packages/web/src/app/login/page.tsx`, `packages/web/src/features/auth/login-form.tsx`

  **Critérios de aceitação:**
  - [ ] Login com email/senha funciona
  - [ ] Sign-up cria conta e faz login automático
  - [ ] Redirect pós-login correto

  **Estratégia de teste:**
  - [ ] Integração: login + redirect

  **Dependências:** NEXT-015
  **Pode rodar em paralelo com:** outras pages

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Login funcionando

---

### 📦 Server Actions — Mutações via Next.js Server Actions

#### Objetivo
Implementar Server Actions para todas as operações de escrita, substituindo os route handlers internos do Vinext.

#### Escopo da categoria
- 4 Server Actions: createOrder, checkinTicket, createEvent, createLot/updateLot

#### Riscos da categoria
- Server Actions revalidam cache automaticamente — verificar que não invalida cache desnecessariamente
- Error handling de Server Actions é diferente de API routes

- [ ] **NEXT-011** — `createOrder` Server Action

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Chama NestJS `POST /api/orders` via `api-client`
  - Retorna `{ checkoutUrl }` para redirecionar ao Stripe
  - Em PAYMENT_MODE=demo, retorna `/checkout/success` direto

  **Arquivos/áreas afetadas:** `packages/web/src/app/eventos/[slug]/actions.ts`

  **Critérios de aceitação:**
  - [ ] Server Action cria pedido no NestJS
  - [ ] Redirect para Stripe checkout URL
  - [ ] Modo demo funciona sem Stripe

  **Estratégia de teste:**
  - [ ] E2E: smoke test de compra

  **Dependências:** NEXT-003, NEXT-015
  **Pode rodar em paralelo com:** NEXT-012, NEXT-013, NEXT-014

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Server Action funcionando

---

- [ ] **NEXT-012** — `checkinTicket` Server Action

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Chama NestJS `POST /api/checkin`
  - Retorna `{ success, message }` para exibir feedback
  - `revalidatePath` não necessário (checkin não afeta views públicas)

  **Arquivos/áreas afetadas:** `packages/web/src/app/checkin/actions.ts`

  **Critérios de aceitação:**
  - [ ] Check-in bem sucedido retorna feedback positivo
  - [ ] Ticket já usado retorna erro específico

  **Estratégia de teste:**
  - [ ] E2E: smoke test de check-in

  **Dependências:** NEXT-003, NEXT-015
  **Pode rodar em paralelo com:** NEXT-011, NEXT-013, NEXT-014

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Server Action funcionando

---

- [ ] **NEXT-013** — `createEvent` Server Action

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Chama NestJS `POST /api/events`
  - `revalidatePath('/admin')` após criação
  - Retorna evento criado com slug gerado

  **Arquivos/áreas afetadas:** `packages/web/src/app/admin/actions.ts`

  **Critérios de aceitação:**
  - [ ] Evento criado e aparece na lista do admin
  - [ ] Slug gerado pelo NestJS (não pelo frontend)

  **Estratégia de teste:**
  - [ ] E2E: smoke test de criação de evento no admin

  **Dependências:** NEXT-003, NEXT-015
  **Pode rodar em paralelo com:** NEXT-011, NEXT-012, NEXT-014

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Server Action funcionando

---

- [ ] **NEXT-014** — `createLot` e `updateLot` Server Actions

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - `createLot`: chama NestJS `POST /api/lots`
  - `updateLot`: chama NestJS `PUT /api/lots/:id`
  - `revalidatePath('/admin')` após ambas as ações

  **Arquivos/áreas afetadas:** `packages/web/src/app/admin/actions.ts`

  **Critérios de aceitação:**
  - [ ] Lote criado aparece no evento
  - [ ] Lote atualizado reflete as mudanças

  **Estratégia de teste:**
  - [ ] E2E: smoke test de criação de lote no admin

  **Dependências:** NEXT-003, NEXT-015
  **Pode rodar em paralelo com:** NEXT-011, NEXT-012, NEXT-013

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Server Actions funcionando

---

### 📦 Auth — Better Auth com Next.js

#### Objetivo
Integrar Better Auth com Next.js 15 usando cookies HttpOnly e implementar middleware de proteção de rotas.

#### Escopo da categoria
- Better Auth adapter para Next.js
- Middleware de proteção de rotas privadas

#### Riscos da categoria
- Better Auth pode ter breaking changes entre versão usada no Vinext e versão compatível com Next.js 15
- Cookie SameSite pode causar problemas com redirecionamentos cross-origin

- [ ] **NEXT-015** — Better Auth adapter para Next.js — session via cookies HttpOnly

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - `packages/web/src/lib/auth.ts` com configuração Better Auth para Next.js
  - `packages/web/src/app/api/auth/[...all]/route.ts` como handler do Better Auth
  - Compartilha mesmo banco Neon (schema users/sessions idêntico ao NestJS)
  - `BETTER_AUTH_SECRET` env sincronizado entre NestJS e Next.js

  **Arquivos/áreas afetadas:** `packages/web/src/lib/auth.ts`, `packages/web/src/app/api/auth/[...all]/route.ts`

  **Critérios de aceitação:**
  - [ ] Login cria sessão com cookie HttpOnly
  - [ ] `auth()` server-side retorna usuário autenticado
  - [ ] Logout limpa cookie corretamente

  **Estratégia de teste:**
  - [ ] Integração: login → session → logout
  - [ ] Auth: cookie presente após login

  **Dependências:** NEXT-001
  **Bloqueia:** NEXT-007, NEXT-008, NEXT-009, NEXT-010, NEXT-016
  **Pode rodar em paralelo com:** NEXT-003, NEXT-004

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Sessão funcionando
  - [ ] Cookie HttpOnly configurado

---

- [ ] **NEXT-016** — Middleware de proteção de rotas em `middleware.ts`

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - `packages/web/src/middleware.ts` com matcher para `/admin`, `/meus-ingressos`, `/checkin`
  - Se sem sessão: redirect para `/login?redirect=<path>`
  - Se com sessão mas role incorreto: redirect para `/` com erro

  **Arquivos/áreas afetadas:** `packages/web/src/middleware.ts`

  **Critérios de aceitação:**
  - [ ] `/meus-ingressos` sem auth → redirect `/login`
  - [ ] `/admin` com role customer → redirect `/`
  - [ ] `/checkin` com role customer → redirect `/`

  **Estratégia de teste:**
  - [ ] Auth/AuthZ: sem sessão → redirect
  - [ ] Auth/AuthZ: role incorreto → redirect

  **Dependências:** NEXT-015
  **Bloqueia:** NEXT-007, NEXT-008, NEXT-009
  **Pode rodar em paralelo com:** pages que não precisam de auth

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Middleware funcionando

---

### 📦 Deploy — Vercel e integração contínua

#### Objetivo
Configurar o deploy no Vercel e adaptar o GitHub Actions para fazer deploy de `packages/web/` no Vercel e `packages/backend/` no Railway.

#### Escopo da categoria
- `vercel.json` config
- GitHub Actions cd-vercel.yml
- E2E smoke tests no stack integrado

- [ ] **NEXT-017** — `vercel.json` config e variáveis de ambiente

  **Modo recomendado:** infra
  **Tipo:** infra

  **Descrição curta:**
  - `packages/web/vercel.json` com `installCommand`, `buildCommand`, `outputDirectory`
  - Env vars no Vercel: `NEXT_PUBLIC_API_URL` (Railway URL), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
  - Headers de segurança configurados

  **Arquivos/áreas afetadas:** `packages/web/vercel.json`

  **Critérios de aceitação:**
  - [ ] Deploy manual `vercel --prod` funciona a partir de `packages/web/`
  - [ ] Env vars configuradas no Vercel dashboard

  **Estratégia de teste:**
  - [ ] Integração: deploy manual e smoke test

  **Dependências:** NEXT-001
  **Pode rodar em paralelo com:** pages migration

  **Prioridade:** 🟡 Alta
  **Estimativa:** 30min
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Deploy no Vercel funcionando

---

- [ ] **NEXT-018** — GitHub Actions `cd-vercel.yml` para deploy automático

  **Modo recomendado:** infra
  **Tipo:** infra

  **Descrição curta:**
  - `.github/workflows/cd-vercel.yml`: deploy de `packages/web/` no Vercel em push para `main`
  - Deploy de `packages/backend/` no Railway em push para `main`
  - Smoke tests após deploy de produção

  **Arquivos/áreas afetadas:** `.github/workflows/cd-vercel.yml`

  **Critérios de aceitação:**
  - [ ] Push para main deploya ambos Vercel + Railway automaticamente
  - [ ] Smoke tests executam após deploy

  **Estratégia de teste:**
  - [ ] Integração: push de teste e verificar Actions

  **Dependências:** NEXT-017, NEST-020
  **Pode rodar em paralelo com:** pages migration

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] CI/CD funcionando para ambos os packages

---

- [ ] **NEXT-019** — E2E smoke tests no stack integrado Next.js + NestJS

  **Modo recomendado:** backend
  **Tipo:** test

  **Descrição curta:**
  - Adaptar scripts de `scripts/smoke/` para apontar para Vercel preview URL
  - `purchase-flow.ts`: acessa home → evento → checkout (modo demo) → meus-ingressos
  - `checkin-flow.ts`: usa código de ticket do purchase-flow para check-in
  - `admin-flow.ts`: login como organizer → cria evento → cria lote → lista pedidos

  **Arquivos/áreas afetadas:** `scripts/smoke/purchase-flow.ts`, `scripts/smoke/checkin-flow.ts`, `scripts/smoke/admin-flow.ts`

  **Critérios de aceitação:**
  - [ ] 3 smoke scripts passam 100% contra Vercel + Railway staging
  - [ ] Scripts documentam URL e ambiente testado

  **Estratégia de teste:**
  - [ ] E2E: os scripts são os testes

  **Dependências:** NEXT-004, NEXT-005, NEXT-007, NEXT-008, NEXT-009
  **Bloqueia:** Sprint 020
  **Pode rodar em paralelo com:** NEXT-017, NEXT-018

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] 3 smoke scripts passando 100%

---

## 🧪 Testes e Validações

- **Suites necessárias:** E2E smoke scripts, Next.js build check
- **Cobertura alvo:** 3 smoke scripts 100% + `next build` sem erros
- **Comandos de verificação:**
  - `cd packages/web && npm run build`
  - `cd packages/web && npm run lint`
  - `node scripts/smoke/purchase-flow.ts --env=staging`
  - `node scripts/smoke/checkin-flow.ts --env=staging`
  - `node scripts/smoke/admin-flow.ts --env=staging`
- **Estado atual:** ⏳ Pendente — fase não iniciada
- **Fluxos críticos a validar manualmente:**
  - Compra completa: home → evento → checkout → meus-ingressos com QR
  - Check-in: /checkin com código de ticket real
  - Admin: criar evento → publicar → ver pedidos

---

## 🔍 Riscos, Bloqueios e Decisões

### Bloqueios atuais
- Sprint 018 deve estar completa (NestJS no Railway) antes de iniciar

### Riscos em aberto
- Better Auth Next.js adapter pode ter comportamento diferente do Vinext — mitigar com spike em NEXT-015 antes de migrar todas as pages
- Tailwind 4 pode ter incompatibilidades com componentes shadcn/ui existentes
- Server Actions têm comportamento de cache agressivo — pode causar stale data

### Decisões importantes
- Server Components para fetch (SSR) + Client Components para interação (padrão Next.js 15)
- Better Auth compartilha o mesmo banco Neon — sem migração de dados necessária
- Deploy no Vercel (free tier) + Railway (free tier) — suficiente para demo/portfolio

---

## 📚 Documentação e Comunicação

- [ ] Atualizar `docs/development/TASKS.md` com Fase 019
- [ ] Atualizar `docs/development/CHANGELOG.md`
- [ ] Atualizar `docs/development/ROADMAP.md` com status da Fase 15
- [ ] Criar `packages/web/README.md` com setup local e deploy instructions
- [ ] Atualizar `docs/development/MIGRATION-PLAN.md` com progresso da migração frontend

---

## ✅ Checklist de Encerramento da Fase

- [ ] Todas as 19 tarefas concluídas
- [ ] `cd packages/web && next build` sem erros
- [ ] Better Auth funcionando com cookies HttpOnly
- [ ] Middleware de proteção de rotas testado para todos os roles
- [ ] 3 smoke scripts passando 100% em staging (Vercel + Railway + Neon)
- [ ] CI/CD deployando ambos packages automaticamente
- [ ] Vinext (Cloudflare Workers) ainda operacional como fallback
- [ ] Documentação atualizada (CHANGELOG, ROADMAP, TASKS)
- [ ] Aprovação final registrada
- [ ] GOV closure criado em `docs/development/Logs/GOV-XXX-phase-019.md`
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
