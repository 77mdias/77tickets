# PM Design Doc — Roadmap Sprints 014–020

> **Status:** Aprovado
> **Data:** 2026-04-01
> **Owner:** @jeandias
> **Contexto:** Review de produto pós-Sprint 013

---

## 1. Situação Atual

O TicketFlow entregou 13 sprints consecutivas cobrindo:

| Área | Status |
|------|--------|
| Domínio + casos de uso (001–005) | ✅ Completo |
| Experiência do comprador e admin (006–008) | ✅ Completo |
| Hardening + migration readiness (009–010) | ✅ Completo |
| CI/CD + segurança (011–013) | ✅ Completo |

**O MVP demo está 100% funcional** com deploy em Cloudflare Workers. Todos os critérios originais do PRD foram atendidos.

**Problema:** O roadmap termina na Sprint 013. Não há documentação de continuidade para as próximas fases de produto nem para a execução da migração Next.js + NestJS planejada no `MIGRATION-PLAN.md`.

---

## 2. Análise de Gaps do Produto (PM View)

### Gaps Funcionais Identificados

| Gap | Impacto no Usuário | Prioridade |
|-----|-------------------|-----------|
| Pedidos nunca transitam de `pending` para `paid` — sem pagamento real | Comprador não recebe ingresso válido | 🔴 Crítico |
| Sem email de confirmação pós-compra | Experiência incompleta; comprador inseguro | 🟡 Alta |
| Sem email de lembrete de evento | Organizer não alcança compradores fora da plataforma | 🟡 Alta |
| Listagem flat sem busca ou filtros | Descoberta de eventos degradada com escala | 🟡 Alta |
| Organizer sem dashboard de métricas | Decisões sem dados; baixa retenção de organizadores | 🟡 Alta |
| UX sem loading states / error boundaries | Percepção de baixa qualidade; confusão em falhas | 🟢 Média |
| Checker digita código manualmente | Fluxo lento na entrada do evento | 🟢 Média |

### Gaps Técnicos (Dívida Estrutural)

| Gap | Impacto | Prioridade |
|-----|---------|-----------|
| Vinext é framework experimental, não production-grade | Risco de manutenção a longo prazo | 🔴 Crítico |
| Frontend acoplado a Cloudflare Workers | Limita portabilidade e ecossistema | 🟡 Alta |
| Sem observabilidade real (Sentry, structured logging) | Produção operada às cegas | 🟡 Alta |

---

## 3. Abordagem Escolhida: Gate-Driven Balanceado

Após análise, a abordagem escolhida é:

**Features de alto impacto (014–017) com guardrails de portabilidade embutidos → Gate formal (017) → Migração em fases (018–020).**

### Por que não features-only?
A migração NestJS está planejada e validada. Postergar indefinidamente gera debt de runtime enquanto features acumulam.

### Por que não migração imediata?
O produto ainda tem gaps funcionais críticos (pagamento). Migrar sem fechar esses gaps seria perder valor de produto durante a migração.

### Por que gate-driven?
O gate da Sprint 017 garante que a base de features está estável e portável antes da migração. Evita "chasing a moving target" durante a migração.

---

## 4. Roadmap — 7 Sprints (014–020)

### Fase de Produto (014–017)

#### Sprint 014 — Payment Gateway Integration (2 semanas)
**Problema:** Pedidos eternamente em `pending`. Sem pagamento, tickets nunca são ativados.

**Solução:**
- Integração Stripe (modo teste) com webhook `POST /api/webhooks/stripe`
- `ConfirmOrderPaymentUseCase`: `pending → paid`, ativa tickets, incrementa coupon
- Contrato `PaymentProvider` em `src/server/payment/` (portável para NestJS)
- Fallback demo: `SimulatePaymentUseCase` quando `PAYMENT_MODE=demo`
- Rollback: reverter env var `PAYMENT_MODE` em < 15 minutos

**Tarefas principais (15):** PAY-001 a PAY-015
**Guardrail:** Zero acoplamento Stripe no domain/application

---

#### Sprint 015 — Email Transacional + Ticket Delivery (1 semana)
**Problema:** Após pagamento, comprador só vê ticket na plataforma. Sem email = experiência incompleta.

**Solução:**
- `EmailProvider` contrato + `ResendEmailProvider` em `src/server/email/`
- `SendOrderConfirmationEmailUseCase`: email com QR codes inline (base64) após pagamento
- `SendEventReminderEmailUseCase`: lembrete 24h antes via cron `/api/cron/event-reminders`
- Retry com backoff (3 tentativas máx.)

**Tarefas principais (11):** EMAIL-001 a EMAIL-011
**Guardrail:** Zero acoplamento Resend no domain/application

---

#### Sprint 016 — Event Discovery + Analytics do Organizador (2 semanas)
**Problema A:** Listagem flat sem busca. **Problema B:** Organizador opera sem dados de vendas.

**Solução Discovery:**
- Campo `category` em `events` + índice GIN fulltext
- `GET /api/events?q=&date=&location=&category=&cursor=` com cursor pagination
- Search bar + filtros na UI com debounce 300ms

**Solução Analytics:**
- `GetEventAnalyticsUseCase`: receita total, tickets por lote, % ocupação, coupon stats
- `GET /api/events/:slug/analytics` (organizer/admin only)
- Painel "Métricas" no admin dashboard

**Tarefas principais (18):** DISC-001 a DISC-010, ANA-001 a ANA-008

---

#### Sprint 017 — UX Polish + Pre-Migration Gate (1.5 semanas) ⚠️ GATE
**Objetivo:** Elevar UX + passar auditoria formal de portabilidade.

**UX Polish:**
- Skeleton screens: event cards, event detail, ticket cards, admin tables
- Error boundaries com mensagens amigáveis em PT-BR
- Toast notifications (pedido criado, check-in sucesso, erro de pagamento)
- Mobile pass: checkout, meus-ingressos, checkin em 375px
- Camera QR scanner via MediaDevices API + `jsQR`

**Migration Gate (bloqueante para Sprint 018):**
- Executar checklist `migration-portability.md` nos módulos 014–016
- E2E smoke scripts: compra, check-in, admin
- Atualizar `MIGRATION-PLAN.md` com estado atual
- Criar `docs/development/MIGRATION-GATE.md` com checkbox `[x] Aprovado`

**⚠️ Sprint 018 NÃO pode iniciar sem `MIGRATION-GATE.md` aprovado.**

**Tarefas principais (15):** UX-001 a UX-010, GATE-001 a GATE-005

---

### Fase de Migração (018–020)

#### Sprint 018 — NestJS Backend Extraction (2.5 semanas)
**Entrada:** Gate Sprint 017 aprovado.

**Execução do MIGRATION-PLAN.md Fase 1:**
- `packages/backend/` com NestJS bootstrapped (porta 3001)
- Domain + application copiados **sem alteração**, validados com `tsc --noEmit` em isolamento
- Controllers NestJS para todos os endpoints (7 controllers)
- Guards: `SessionGuard`, `RolesGuard`, `OwnershipGuard`
- DI: `DatabaseModule`, `EmailModule`, `PaymentModule` como NestJS providers
- Deploy no Railway com health check

**Tarefas principais (20):** NEST-001 a NEST-020

---

#### Sprint 019 — Next.js Frontend Migration (2 semanas)
**Entrada:** Sprint 018 completa (NestJS rodando no Railway).

**Execução do MIGRATION-PLAN.md Fase 2:**
- `packages/web/` com Next.js 15 App Router
- 9 rotas migradas: `/`, `/eventos/[slug]`, `/checkout/*`, `/meus-ingressos`, `/admin`, `/checkin`, `/login`
- `lib/api-client.ts` apontando para Railway NestJS
- Server Actions para mutações
- Better Auth com Next.js (cookies HttpOnly)
- Deploy no Vercel

**Tarefas principais (19):** NEXT-001 a NEXT-019

---

#### Sprint 020 — Production Hardening + Launch (1.5 semanas)
**Entrada:** Sprint 019 completa (Next.js rodando no Vercel).

**Hardening:**
- Sentry em NestJS + Next.js (error tracking + tracing)
- Winston structured logging (substitui `console.log`)
- `GET /api/health` com check de DB
- Core Web Vitals: LCP < 2.5s, CLS < 0.1 via Lighthouse CI
- Bundle: páginas críticas < 200KB JS parsed
- Staging environment: Railway staging + Vercel preview + Neon branch
- 4 runbooks atualizados (+ payment-failure.md novo)
- `MIGRATION-COMPLETE.md` + `GO-LIVE-CHECKLIST.md`
- Go-live oficial

**Tarefas principais (15):** PROD-001 a PROD-015

---

## 5. Visão de Dependências

```
013 ✅
 │
 ▼
014 Payment Gateway ──────────────────────────────┐
 │                                                │
 ▼                                                │
015 Email ──────────────────────────────────────────┤  PRODUTO
 │                                                │
 ▼                                                │
016 Discovery + Analytics ───────────────────────┤
 │                                                │
 ▼                                                │
017 UX Polish + [GATE] ───────────────────────────┘
 │
 │ ← MIGRATION-GATE.md aprovado
 ▼
018 NestJS Backend ───────────────────────────────┐
 │                                                │
 ▼                                                │  MIGRAÇÃO
019 Next.js Frontend ────────────────────────────┤
 │                                                │
 ▼                                                │
020 Production Hardening + Launch ───────────────┘
```

---

## 6. Critérios de Evolução de Fase

Uma sprint só avança para a próxima quando:
- Todos os critérios de sucesso atendidos
- Testes relevantes passando (unit + integration + regression)
- Sem violação arquitetural (lint:architecture verde)
- Documentação (TASKS.md + CHANGELOG.md) atualizada
- Para Sprint 017 especificamente: `MIGRATION-GATE.md` assinado

---

## 7. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Stripe webhook failures em produção | Média | Alto | Retry + dead letter queue + runbook payment-failure |
| NestJS DI breaks dependency chain | Baixa | Alto | Validar `tsc --noEmit` em isolamento antes de iniciar controllers |
| Better Auth incompatibilidade Next.js 15 | Baixa | Alto | Spike técnico (NEXT-015) antes de migrar pages |
| Lighthouse CI bloqueia deploy por performance | Média | Médio | Bundle analysis antecipado na PROD-005 |
| Gate Sprint 017 não aprovado → Sprint 018 bloqueada | Baixa | Crítico | Gate é checklist — problemas encontrados viram tasks retroativas em sprints anteriores |

---

## 8. Definition of Done — Roadmap Completo

O roadmap 014–020 está concluído quando:
- [ ] Todos os 7 sprints entregues com Definition of Done individual aprovado
- [ ] Stack Next.js + NestJS em produção (Vercel + Railway)
- [ ] Smoke tests 100% passando em staging e produção
- [ ] Sentry ativo, health check respondendo, logs estruturados funcionando
- [ ] `CHANGELOG.md` com versão datada cobrindo 014–020
- [ ] `MIGRATION-COMPLETE.md` criado
- [ ] Vinext/Cloudflare Workers aposentado formalmente
