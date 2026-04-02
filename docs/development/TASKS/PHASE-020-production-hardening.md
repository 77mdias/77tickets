---
title: Task Board — Fase 020: Production Hardening + Launch
type: phase-task-board
mode: execution-tracking
status: draft
---

# 🚀 Tasks — Fase 020: Production Hardening + Launch

**Status:** 🟡 Planejada
**Última atualização:** 2026-04-01
**Sprint Atual:** Sprint 020
**Modo principal:** mixed (backend + infra)
**Status Geral:** ⏳ 0% (0/15 tarefas completas) — FASE PLANEJADA
**ETA:** 1.5 semanas
**Pré-requisito:** Fase 019 — Next.js Frontend Migration ✅ (Next.js no Vercel + NestJS no Railway)
**Owner:** @jeandias
**Docs relacionadas:** `docs/development/SPRINTS/SPRINT-020.md`, `docs/infrastructure/`

---

## 📊 Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Observabilidade | 4 | 0 | 0 | 4 | 0 |
| Performance | 4 | 0 | 0 | 4 | 0 |
| Infraestrutura | 3 | 0 | 0 | 3 | 0 |
| Documentação & Launch | 4 | 0 | 0 | 4 | 0 |
| **TOTAL** | **15** | **0** | **0** | **15** | **0** |

### 🎯 Principais Indicadores
- ⏳ Fase planejada — aguardando Sprint 019
- 🔴 Milestone: go-live oficial ao final desta fase
- 🧪 Meta: Sentry ativo, Core Web Vitals ≥ 90, smoke tests 100% em staging
- 📦 Entrega: plataforma em produção com observabilidade completa

---

## 🎯 Objetivos da Fase

- Configurar Sentry em NestJS e Next.js para error tracking e tracing
- Substituir `console.log` por structured logging (Winston) com correlação de request-id
- Implementar `GET /api/health` com check real do banco de dados
- Atingir Core Web Vitals: LCP < 2.5s, CLS < 0.1 nas páginas críticas
- Configurar staging environment completo com dados mascarados
- Atualizar os 4 runbooks para o novo stack (NestJS + Next.js)
- Realizar go-live oficial com checklist completado

---

## 🗺️ Dependências, Batches e Caminho Crítico

### Dependências macro
- Sprint 019 completa: Next.js no Vercel + NestJS no Railway
- Contas Sentry criadas (free tier disponível)
- Staging environment URLs conhecidas

### Caminho crítico
1. PROD-001 (Sentry NestJS) — base da observabilidade
2. PROD-003 (Structured logging) — depende de PROD-001 para correlação
3. PROD-004 (Health check) — necessário para Railway health check
4. PROD-009 (Staging environment) — necessário para testes de smoke em staging
5. PROD-014 (Go-live checklist) — validação final
6. PROD-015 (CHANGELOG versão final) — encerramento formal

### Paralelização possível
- PROD-002 (Sentry Next.js) em paralelo com PROD-001
- PROD-005, PROD-006, PROD-007 (performance) em paralelo
- PROD-008 (Lighthouse CI) independente
- PROD-012, PROD-013 (documentação) em paralelo com infraestrutura
- PROD-010, PROD-011 (infra complementar) após PROD-009

### Checkpoints
- [ ] Sentry ativo em ambos (NestJS + Next.js)
- [ ] Structured logging com request-id funcionando
- [ ] Core Web Vitals dentro do target
- [ ] Staging environment validado com smoke tests
- [ ] Go-live checklist aprovado

---

## 📦 Estrutura de Categorias

---

### 📦 Observabilidade — Error tracking, logging e health check

#### Objetivo
Dar visibilidade operacional à plataforma: erros capturados no Sentry, logs estruturados com correlação e health check para monitoramento de infra.

#### Escopo da categoria
- Sentry em NestJS e Next.js
- Winston structured logging no NestJS
- Health check endpoint no NestJS

#### Riscos da categoria
- Sentry pode capturar dados sensíveis (PII) — configurar `beforeSend` para filtrar
- Winston pode ter impacto de performance em alta carga — usar async transport

#### Observabilidade.1 — Error Tracking e Logging

- [ ] **PROD-001** — Sentry SDK em NestJS: `SentryModule`, exception filter global, transaction tracing

  **Modo recomendado:** backend
  **Tipo:** infra

  **Descrição curta:**
  - `@sentry/nestjs` instalado em `packages/backend`
  - `SentryModule.forRoot({ dsn: process.env.SENTRY_DSN })` no `AppModule`
  - Global exception filter captura todas as exceções não tratadas
  - Performance tracing nas transactions HTTP (POST /api/orders, POST /api/checkin, POST /api/webhooks/stripe)
  - `beforeSend`: filtrar campos sensíveis (password, token, card)

  **Arquivos/áreas afetadas:** `packages/backend/src/app.module.ts`, `packages/backend/src/infrastructure/sentry/sentry.exception-filter.ts`

  **Critérios de aceitação:**
  - [ ] Erro não tratado aparece no Sentry com stack trace + contexto de request
  - [ ] Transações HTTP visíveis no Sentry Performance dashboard
  - [ ] PII filtrado no `beforeSend`

  **Estratégia de teste:**
  - [ ] Integração: lançar erro proposital → verificar no Sentry

  **Dependências:** NEST-001 (packages/backend existente)
  **Bloqueia:** PROD-003 (correlação de request-id com Sentry trace)
  **Pode rodar em paralelo com:** PROD-002

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Sentry recebendo eventos
  - [ ] PII filtrado

---

- [ ] **PROD-002** — Sentry SDK em Next.js: client errors + server errors + Web Vitals

  **Modo recomendado:** frontend
  **Tipo:** infra

  **Descrição curta:**
  - `@sentry/nextjs` instalado em `packages/web`
  - `sentry.client.config.ts` e `sentry.server.config.ts`
  - Web Vitals automático: LCP, FCP, CLS, FID enviados para Sentry
  - Error boundaries integrados com Sentry

  **Arquivos/áreas afetadas:** `packages/web/sentry.client.config.ts`, `packages/web/sentry.server.config.ts`, `packages/web/next.config.ts`

  **Critérios de aceitação:**
  - [ ] Erros client-side aparecem no Sentry com contexto de usuário
  - [ ] Web Vitals visíveis no Sentry Performance
  - [ ] `NEXT_PUBLIC_SENTRY_DSN` configurado no Vercel

  **Estratégia de teste:**
  - [ ] Manual: trigger de erro client-side → verificar no Sentry

  **Dependências:** NEXT-001 (packages/web existente)
  **Pode rodar em paralelo com:** PROD-001

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Sentry Next.js ativo

---

- [ ] **PROD-003** — Structured logging: Winston com request-id correlation em NestJS

  **Modo recomendado:** backend
  **Tipo:** infra

  **Descrição curta:**
  - `winston` + `nest-winston` instalados no `packages/backend`
  - Middleware que gera `request-id` (UUID v4) por request e injeta em `AsyncLocalStorage`
  - `LoggerService` wrapper sobre Winston com `info/warn/error` + request-id automático
  - Substituir todos os `console.log` por `this.logger.log/warn/error`
  - Formato JSON: `{ timestamp, level, message, requestId, userId, path, duration }`

  **Arquivos/áreas afetadas:** `packages/backend/src/infrastructure/logging/logger.service.ts`, `packages/backend/src/infrastructure/logging/logging.module.ts`, `packages/backend/src/infrastructure/logging/request-id.middleware.ts`

  **Critérios de aceitação:**
  - [ ] Todos os logs em formato JSON com request-id
  - [ ] Mesmo request-id em todos os logs de uma requisição (usando AsyncLocalStorage)
  - [ ] `console.log` removido de todos os arquivos em `packages/backend/`
  - [ ] Logs visíveis no Railway dashboard

  **Estratégia de teste:**
  - [ ] Integração: fazer request e verificar logs no Railway

  **Dependências:** PROD-001
  **Pode rodar em paralelo com:** PROD-004

  **Prioridade:** 🟡 Alta
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Logging estruturado funcionando
  - [ ] console.log removido

---

- [ ] **PROD-004** — Health check endpoint `GET /api/health`

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - `GET /api/health` retorna `{ status: 'ok', db: 'connected', uptime, version }`
  - Executa `SELECT 1` para verificar conexão com banco
  - Se DB inacessível: retorna `{ status: 'degraded', db: 'error' }` com HTTP 503
  - Railway e Railway Healthcheck usa este endpoint

  **Arquivos/áreas afetadas:** `packages/backend/src/api/health/health.controller.ts`

  **Critérios de aceitação:**
  - [ ] `GET /api/health` retorna 200 com DB acessível
  - [ ] `GET /api/health` retorna 503 com DB inacessível
  - [ ] Resposta em < 100ms com DB saudável

  **Estratégia de teste:**
  - [ ] Integração: health check com DB acessível e inacessível
  - [ ] Integração: verificar que Railway usa este endpoint para healthcheck

  **Dependências:** NEST-002 (NestJS bootstrap)
  **Pode rodar em paralelo com:** PROD-003

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Health check funcionando

---

### 📦 Performance — Bundle, imagens e caching

#### Objetivo
Garantir que o Next.js atinge os targets de Core Web Vitals e que o bundle JS está dentro do limite aceitável para a experiência de usuário.

#### Escopo da categoria
- Bundle analysis das páginas críticas
- `next/image` para imagens de eventos
- Cache-Control no NestJS para rotas read-only
- Lighthouse CI no GitHub Actions

#### Riscos da categoria
- Bundle pode ser acima de 200KB se componentes shadcn/ui não forem lazy-loaded
- Lighthouse CI pode falhar em ambiente CI com latência alta — usar `preset: desktop`

#### Performance.1 — Otimização

- [ ] **PROD-005** — Bundle analysis: `@next/bundle-analyzer` nas páginas críticas

  **Modo recomendado:** frontend
  **Tipo:** refactor

  **Descrição curta:**
  - Instalar `@next/bundle-analyzer`
  - `ANALYZE=true npm run build` para ver bundle por página
  - Identificar componentes pesados e aplicar `dynamic(() => import(...), { ssr: false })`
  - Meta: páginas críticas (/, /eventos/[slug], /checkout) < 200KB JS parsed

  **Arquivos/áreas afetadas:** `packages/web/next.config.ts`, `packages/web/src/app/`

  **Critérios de aceitação:**
  - [ ] Bundle analyzer mostra breakdown por página
  - [ ] Páginas críticas < 200KB JS parsed
  - [ ] Componentes pesados (gráficos, QR, scanner) lazy-loaded

  **Estratégia de teste:**
  - [ ] Manual: `ANALYZE=true npm run build` e inspecionar visualmente

  **Dependências:** NEXT-001 (packages/web existente)
  **Pode rodar em paralelo com:** PROD-006, PROD-007, PROD-008

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Bundle dentro do limite
  - [ ] Lazy loading aplicado onde necessário

---

- [ ] **PROD-006** — `next/image` para imagens de eventos (`imageUrl`)

  **Modo recomendado:** frontend
  **Tipo:** refactor

  **Descrição curta:**
  - Substituir `<img src={event.imageUrl}>` por `<Image src={event.imageUrl} fill sizes="...">` em todas as páginas
  - Configurar `remotePatterns` no `next.config.ts` para aceitar URLs externas
  - Lazy loading automático (below the fold)
  - LQIP (blur placeholder) onde disponível

  **Arquivos/áreas afetadas:** `packages/web/src/app/page.tsx`, `packages/web/src/app/eventos/[slug]/page.tsx`, `packages/web/next.config.ts`

  **Critérios de aceitação:**
  - [ ] Todas as `<img>` de eventos trocadas por `<Image>` do Next.js
  - [ ] `remotePatterns` configurado para os domínios de imagem usados
  - [ ] LCP melhora nas páginas com imagem acima do fold

  **Estratégia de teste:**
  - [ ] Manual: Lighthouse no mobile verifica LCP

  **Dependências:** NEXT-004, NEXT-005
  **Pode rodar em paralelo com:** PROD-005, PROD-007

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] next/image em todas as páginas

---

- [ ] **PROD-007** — Cache-Control headers nas rotas read-only do NestJS

  **Modo recomendado:** backend
  **Tipo:** refactor

  **Descrição curta:**
  - `GET /api/events`: `Cache-Control: public, max-age=60, stale-while-revalidate=300`
  - `GET /api/events/:slug`: `Cache-Control: public, max-age=60, stale-while-revalidate=120`
  - Rotas autenticadas: `Cache-Control: private, no-store`

  **Arquivos/áreas afetadas:** `packages/backend/src/api/events/events.controller.ts`

  **Critérios de aceitação:**
  - [ ] Rotas públicas retornam Cache-Control correto
  - [ ] Rotas autenticadas retornam `private, no-store`
  - [ ] Vercel CDN cacheia as rotas públicas automaticamente

  **Estratégia de teste:**
  - [ ] Manual: verificar headers no browser DevTools

  **Dependências:** NEST-006 (EventsController)
  **Pode rodar em paralelo com:** PROD-005, PROD-006

  **Prioridade:** 🟢 Média
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Headers configurados

---

- [ ] **PROD-008** — Lighthouse CI no GitHub Actions — bloqueia PR se Web Vitals abaixo do target

  **Modo recomendado:** infra
  **Tipo:** infra

  **Descrição curta:**
  - `.github/workflows/lighthouse.yml` rodando em PRs
  - `lhci autorun` contra Vercel preview URL
  - Budget: LCP ≤ 2500ms, CLS ≤ 0.1, FID ≤ 100ms, performance score ≥ 80
  - PR bloqueado se qualquer página crítica falhar o budget

  **Arquivos/áreas afetadas:** `.github/workflows/lighthouse.yml`, `lighthouserc.json`

  **Critérios de aceitação:**
  - [ ] Lighthouse CI roda em todo PR
  - [ ] Falha de budget bloqueia merge
  - [ ] Report HTML disponível como artifact

  **Estratégia de teste:**
  - [ ] Integração: abrir PR e verificar Lighthouse CI

  **Dependências:** NEXT-017 (Vercel deploy)
  **Pode rodar em paralelo com:** PROD-005, PROD-006, PROD-007

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Lighthouse CI passando no pipeline

---

### 📦 Infraestrutura — Staging, secrets e connection pooling

#### Objetivo
Configurar um staging environment completo com dados mascarados para validar deploys antes de produção, e otimizar o gerenciamento de secrets e connection pooling.

#### Escopo da categoria
- Staging environment: Railway staging + Vercel preview + Neon branch
- GitHub Environments separados (staging/production)
- Connection pooling tuning no Neon

#### Riscos da categoria
- Neon branch de staging pode ter dados desatualizados — atualizar periodicamente
- Railway free tier pode ter cold start de 30s — documentar no runbook

- [ ] **PROD-009** — Staging environment completo

  **Modo recomendado:** infra
  **Tipo:** infra

  **Descrição curta:**
  - Railway: criar serviço `77tickets-staging` com branch `staging` do GitHub
  - Vercel: ativar preview deployments para branch `staging`
  - Neon: criar branch `staging` do banco (fork do main, com PII removido)
  - `STAGING_DATABASE_URL` apontando para Neon staging branch

  **Arquivos/áreas afetadas:** `.github/workflows/cd-vercel.yml`, configuração Railway e Neon

  **Critérios de aceitação:**
  - [ ] Push para branch `staging` deploya ambos Railway e Vercel staging
  - [ ] Smoke tests `--env=staging` passam 100%
  - [ ] Dados de staging não contêm PII real

  **Estratégia de teste:**
  - [ ] Integração: push para staging e smoke tests

  **Dependências:** NEXT-018, NEST-020
  **Bloqueia:** PROD-010
  **Pode rodar em paralelo com:** PROD-005 a PROD-008

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Staging funcionando
  - [ ] Smoke tests passando

---

- [ ] **PROD-010** — Secrets management: GitHub Environments separados

  **Modo recomendado:** infra
  **Tipo:** infra

  **Descrição curta:**
  - GitHub Environment `staging`: STAGING_DATABASE_URL, RAILWAY_STAGING_URL, VERCEL_STAGING_URL
  - GitHub Environment `production`: DATABASE_URL, RAILWAY_PROD_URL, VERCEL_PROD_URL
  - Secrets sensíveis (STRIPE_SECRET_KEY, SENTRY_DSN) em ambos os environments
  - `cd-vercel.yml` usa `environment: staging` ou `environment: production` por branch

  **Arquivos/áreas afetadas:** `.github/workflows/cd-vercel.yml`

  **Critérios de aceitação:**
  - [ ] Staging e production usam DATABASE_URL diferentes
  - [ ] Secrets de produção nunca expostos em staging
  - [ ] Workflow usa environment correto por branch

  **Estratégia de teste:**
  - [ ] Manual: verificar que staging aponta para Neon staging branch

  **Dependências:** PROD-009
  **Pode rodar em paralelo com:** PROD-011

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Environments separados configurados

---

- [ ] **PROD-011** — Database connection pooling tuning (PgBouncer via Neon)

  **Modo recomendado:** backend
  **Tipo:** infra

  **Descrição curta:**
  - Trocar `DATABASE_URL` do modo `session` para `transaction` mode do Neon (PgBouncer)
  - Ajustar `max` connections no pool do Drizzle de acordo com Railway free tier (10 max)
  - Adicionar log de warning se pool estiver próximo do limite

  **Arquivos/áreas afetadas:** `packages/backend/src/infrastructure/database/database.module.ts`

  **Critérios de aceitação:**
  - [ ] Connection string usa `?pgbouncer=true&connection_limit=10`
  - [ ] Neon free tier não satura com load normal
  - [ ] Pool connections visíveis no Neon dashboard

  **Estratégia de teste:**
  - [ ] Integração: smoke test com 10 requests simultâneos sem timeout

  **Dependências:** NEST-016
  **Pode rodar em paralelo com:** PROD-010

  **Prioridade:** 🟢 Média
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Connection pooling configurado

---

### 📦 Documentação & Launch — Runbooks, docs e go-live

#### Objetivo
Atualizar toda a documentação operacional para o novo stack, criar o go-live checklist e realizar o lançamento oficial com CHANGELOG versionado.

#### Escopo da categoria
- 4 runbooks atualizados + 1 novo (payment-failure)
- `MIGRATION-COMPLETE.md` e `GO-LIVE-CHECKLIST.md`
- CHANGELOG versão datada final

#### Riscos da categoria
- Runbooks podem ficar desatualizados rapidamente — documentar apenas o essencial (sintomas + diagnóstico + resolução)

#### Launch.1 — Documentação e Go-Live

- [ ] **PROD-012** — Runbooks atualizados para o novo stack

  **Modo recomendado:** docs
  **Tipo:** docs

  **Descrição curta:**
  - `docs/infrastructure/runbooks/auth-failure.md` — atualizar para Next.js + Better Auth cookies
  - `docs/infrastructure/runbooks/checkin-failure.md` — atualizar para NestJS + Railway logs
  - `docs/infrastructure/runbooks/checkout-failure.md` — atualizar para NestJS + Stripe webhooks
  - `docs/infrastructure/runbooks/payment-failure.md` — NOVO: Stripe webhook failure, order stuck in pending

  **Arquivos/áreas afetadas:** `docs/infrastructure/runbooks/` (3 atualizados + 1 novo)

  **Critérios de aceitação:**
  - [ ] Cada runbook tem: sintomas, diagnóstico (links Sentry + Railway/Vercel logs), passos de resolução
  - [ ] `payment-failure.md` criado com cenários: webhook não recebido, order stuck, assinatura inválida
  - [ ] Links para Sentry, Railway e Vercel dashboards nos runbooks

  **Estratégia de teste:**
  - [ ] Manual: peer review dos runbooks

  **Dependências:** PROD-001 (Sentry links), PROD-009 (staging URLs)
  **Pode rodar em paralelo com:** PROD-013

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] 4 runbooks completos e precisos

---

- [ ] **PROD-013** — `docs/development/MIGRATION-COMPLETE.md` — sumário da migração

  **Modo recomendado:** docs
  **Tipo:** docs

  **Descrição curta:**
  - Resumo executivo da migração Vinext → NestJS + Next.js
  - Decisões técnicas tomadas: monorepo, Better Auth shared DB, Railway + Vercel
  - Lessons learned: o que funcionou, o que foi mais difícil
  - Estado final: arquivos criados, tests passando, deploys ativos

  **Arquivos/áreas afetadas:** `docs/development/MIGRATION-COMPLETE.md`

  **Critérios de aceitação:**
  - [ ] Documento criado com sumário claro da migração
  - [ ] Decisões arquiteturais documentadas com justificativas
  - [ ] Lessons learned incluídos para referência futura

  **Estratégia de teste:**
  - [ ] Manual: revisão de conteúdo

  **Dependências:** Sprint 019 completa
  **Pode rodar em paralelo com:** PROD-012

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Documento criado e revisado

---

- [ ] **PROD-014** — Go-live checklist: segurança, performance, observabilidade, rollback

  **Modo recomendado:** docs
  **Tipo:** docs

  **Descrição curta:**
  - `docs/development/GO-LIVE-CHECKLIST.md` com todos os critérios antes do go-live
  - Seções: Segurança (HTTPS, headers, rate limiting, secrets), Performance (Lighthouse ≥ 80, bundle < 200KB), Observabilidade (Sentry ativo, health check OK, logs estruturados), Rollback (Vinext ainda deployado como fallback por 7 dias)

  **Arquivos/áreas afetadas:** `docs/development/GO-LIVE-CHECKLIST.md`

  **Critérios de aceitação:**
  - [ ] Checklist completo com todos os critérios verificáveis
  - [ ] Cada item tem: critério, como verificar, responsável
  - [ ] Checklist executado e assinado antes do go-live

  **Estratégia de teste:**
  - [ ] Manual: executar checklist completo em staging

  **Dependências:** PROD-001, PROD-004, PROD-008, PROD-009
  **Bloqueia:** Go-live
  **Pode rodar em paralelo com:** PROD-012, PROD-013

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Checklist criado e executado
  - [ ] Go-live autorizado

---

- [ ] **PROD-015** — `CHANGELOG.md`: promover `[Unreleased]` para versão datada final

  **Modo recomendado:** docs
  **Tipo:** docs

  **Descrição curta:**
  - Mover todo conteúdo de `## [Unreleased]` para `## [2026-XX-XX] — Sprint 014–020 — Feature + Migration`
  - Adicionar novo `## [Unreleased]` vazio acima
  - Incluir resumo: payment gateway, email, discovery, analytics, UX, NestJS, Next.js, production hardening

  **Arquivos/áreas afetadas:** `docs/development/CHANGELOG.md`

  **Critérios de aceitação:**
  - [ ] CHANGELOG tem versão datada cobrindo sprints 014–020
  - [ ] `[Unreleased]` vazio pronto para próximos trabalhos
  - [ ] Formato "Keep a Changelog" mantido

  **Estratégia de teste:**
  - [ ] Manual: revisão do CHANGELOG

  **Dependências:** Todos os itens anteriores de PROD
  **Pode rodar em paralelo com:** Nenhuma (última task)

  **Prioridade:** 🟡 Alta
  **Estimativa:** 30min
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] CHANGELOG versionado
  - [ ] [Unreleased] vazio pronto

---

## 🧪 Testes e Validações

- **Suites necessárias:** Lighthouse CI, smoke scripts, health check HTTP
- **Cobertura alvo:** Core Web Vitals ≥ 80 score, smoke tests 100%, health check < 100ms
- **Comandos de verificação:**
  - `curl https://api.77tickets.railway.app/api/health`
  - `cd packages/web && ANALYZE=true next build`
  - `npx lhci autorun --config=lighthouserc.json`
  - `node scripts/smoke/purchase-flow.ts --env=staging`
  - `node scripts/smoke/checkin-flow.ts --env=staging`
  - `node scripts/smoke/admin-flow.ts --env=staging`
- **Estado atual:** ⏳ Pendente — fase não iniciada
- **Fluxos críticos a validar manualmente:**
  - Erro proposital no NestJS aparece no Sentry com stack trace e request-id
  - Logs do Railway mostram JSON estruturado com request-id consistente
  - Lighthouse CI na home: LCP < 2.5s, CLS < 0.1
  - Go-live checklist completo e todos os itens marcados

---

## 🔍 Riscos, Bloqueios e Decisões

### Bloqueios atuais
- Sprints 018 e 019 devem estar completas antes de iniciar

### Riscos em aberto
- Sentry pode capturar PII involuntariamente — mitigar com `beforeSend` filter (PROD-001)
- Railway free tier tem cold start de 30s — documentar no runbook de operações
- Lighthouse CI em ambiente CI pode variar — usar `preset: desktop` para estabilidade
- Vinext/Cloudflare Workers sendo aposentado: manter por 7 dias como fallback após go-live

### Decisões importantes
- Go-live: DNS/URL oficial aponta para Vercel + Railway; Vinext permanece como fallback por 7 dias
- Sentry free tier (5k events/mês): suficiente para demo/portfolio
- Neon free tier: 512MB storage, 3 branches — suficiente para staging + production
- Railway free tier: $5 crédito/mês — suficiente para demo com baixo tráfego

---

## 📚 Documentação e Comunicação

- [ ] Atualizar `docs/development/TASKS.md` com Fase 020
- [ ] Atualizar `docs/development/ROADMAP.md` com status da Fase 16 (Concluída)
- [ ] Atualizar `docs/development/CHANGELOG.md` (PROD-015)
- [ ] Criar `docs/development/MIGRATION-COMPLETE.md` (PROD-013)
- [ ] Criar `docs/development/GO-LIVE-CHECKLIST.md` (PROD-014)
- [ ] Atualizar 4 runbooks em `docs/infrastructure/runbooks/`

---

## ✅ Checklist de Encerramento da Fase

- [ ] Sentry ativo em NestJS e Next.js — eventos chegando ao dashboard
- [ ] Structured logging com request-id funcionando — logs JSON no Railway
- [ ] `GET /api/health` retornando 200 com DB check
- [ ] Core Web Vitals: LCP < 2.5s e CLS < 0.1 nas páginas críticas
- [ ] Bundle das páginas críticas < 200KB JS parsed
- [ ] Staging environment funcionando com smoke tests 100%
- [ ] GitHub Environments (staging / production) com secrets separados
- [ ] 4 runbooks atualizados + `payment-failure.md` criado
- [ ] `MIGRATION-COMPLETE.md` criado e revisado
- [ ] Go-live checklist completo e todos os itens aprovados
- [ ] CHANGELOG versionado com todas as sprints 014–020
- [ ] Vinext/Cloudflare Workers mantido como fallback por 7 dias pós go-live
- [ ] Aprovação final registrada
- [ ] GOV closure criado em `docs/development/Logs/GOV-XXX-phase-020.md`

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
