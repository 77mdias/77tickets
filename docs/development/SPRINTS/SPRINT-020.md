---
title: Sprint 020 — Production Hardening + Launch
type: sprint
mode: mixed
approach: tdd-first
status: planned
---

# Sprint 020 — Production Hardening + Launch

## 1. Objetivo

Elevar o stack migrado (NestJS + Next.js) para nível de produção real com observabilidade estruturada (Sentry + Winston), performance otimizada (Core Web Vitals + bundle budget), staging environment funcional e runbooks atualizados — culminando no go-live oficial do TicketFlow.

> **SPRINT FINAL:** Esta é a última sprint do ciclo de desenvolvimento. Ao concluí-la, o produto estará em produção real, com Sentry capturando erros, logs estruturados, staging validado e go-live documentado. A era Vinext/Cloudflare Workers encerra aqui.

---

## 2. Resumo Executivo

- **Tipo da sprint:** hardening
- **Modo principal do Agent OS:** mixed (backend + infra)
- **Fase relacionada:** Fase 020 — Production Hardening + Launch
- **Status:** 🟢 Planejada
- **Prioridade:** 🔴 Crítica
- **Owner principal:** @jeandias
- **Dependências externas:** Sprint 019 ✅ (Next.js rodando no Vercel)
- **Janela estimada:** 1,5 semanas

---

## 3. Contexto

- **Problema atual:**
  - `console.log` ainda é o único mecanismo de logging no NestJS backend — inadequado para produção, sem níveis, sem correlação de request-id e sem saída estruturada.
  - Nenhuma ferramenta de error tracking está configurada: erros silenciosos em produção não chegam a nenhum alerta.
  - Core Web Vitals do novo stack Next.js não foram medidos — não há garantia de que LCP, FID e CLS estão dentro dos limites aceitáveis.
  - Não existe staging environment: qualquer mudança vai direto para o ambiente de produção sem validação prévia isolada.
  - Os runbooks existentes em `docs/infrastructure/runbooks/` documentam o stack Vinext/Cloudflare Workers — precisam ser reescritos para NestJS + Next.js + Railway + Vercel.

- **Impacto no sistema/produto:**
  - Sem observabilidade, falhas em produção são descobertas apenas por usuários reclamando.
  - Sem staging, regressões só são detectadas em produção.
  - Sem métricas de performance, o produto pode ter experiência degradada sem percepção.
  - Runbooks desatualizados aumentam o MTTR de incidentes operacionais.

- **Riscos envolvidos:**
  - Integração Sentry em NestJS exige cuidado com order de middleware — o `SentryModule` precisa ser inicializado antes dos filtros de exceção customizados.
  - Neon free tier tem limite de conexões simultâneas — connection pooling via PgBouncer pode conflitar com configuração do Drizzle ORM.
  - Lighthouse CI pode falhar em CI por limitações de CPU/memória dos runners — thresholds precisam ser calibrados para ambiente de CI.
  - Staging com Neon branch de dados mascarados exige script de PII removal — risco de expor dados reais se o processo não for automatizado.

- **Áreas afetadas:**
  - `packages/backend/` — Sentry, Winston logging, health check, cache headers, pooling
  - `packages/web/` — Sentry Next.js, bundle analyzer, `next/image`, Lighthouse CI
  - `.github/workflows/` — workflow Lighthouse CI
  - `docs/infrastructure/runbooks/` — 4 runbooks (3 atualizações + 1 novo)
  - `docs/development/` — `MIGRATION-COMPLETE.md`, `GO-LIVE-CHECKLIST.md`
  - `CHANGELOG.md` — versão datada

- **Fluxos de usuário impactados:**
  - Toda navegação pública (Lighthouse CI mede LCP nas páginas críticas)
  - Checkout e compra (error tracking Sentry captura falhas de pagamento)
  - Check-in (health check e logs de request-id rastreiam requests de checkers)
  - Admin (bundle budget e Core Web Vitals se aplicam ao dashboard admin)

- **Premissas importantes:**
  - Sprint 019 está concluída: NestJS em Railway e Next.js em Vercel estão deployados e funcionais.
  - Conta Sentry já existe ou será criada durante a sprint (plano free suficiente para demo).
  - Railway suporta health check via `GET /api/health` configurável nas configurações do serviço.
  - Neon oferece branch de database para staging via CLI ou dashboard.
  - `@sentry/nestjs` e `@sentry/nextjs` são os SDKs corretos para as versões de framework em uso.

- **Fora de escopo nesta sprint:**
  - BI externo ou dashboards de analytics (Amplitude, Mixpanel).
  - APM comercial avançado (Datadog, New Relic).
  - CDN custom ou multi-region deploy.
  - Testes de carga ou stress testing.
  - Migração de dados de produção reais (apenas dados de demo).

---

## 4. Critérios de Sucesso

- [ ] Sentry configurado em NestJS: `SentryModule.forRoot()` ativo, global exception filter capturando todas as exceções não tratadas, transaction tracing habilitado com status code HTTP.
- [ ] Sentry configurado em Next.js: client errors, server errors e Web Vitals enviados para o mesmo projeto Sentry; `NEXT_PUBLIC_SENTRY_DSN` configurada no Vercel.
- [ ] Structured logging: Winston operacional em NestJS com levels `info`, `warn`, `error`; request-id gerado por middleware e injetado em todos os logs do ciclo de vida do request; `console.log` eliminado do codebase de produção.
- [ ] `GET /api/health` retorna `{ status: 'ok', db: 'connected', uptime, version }` com latência < 100ms quando DB acessível; retorna 503 quando DB inacessível.
- [ ] Core Web Vitals medidos via Lighthouse CI: LCP < 2.5s, FID < 100ms, CLS < 0.1 nas páginas `/`, `/eventos/[slug]` e `/checkout`.
- [ ] Bundle JS parsed < 200KB nas 3 páginas críticas verificado via `@next/bundle-analyzer`.
- [ ] Staging environment funcional: branch `staging` → Railway backend staging + Vercel preview + Neon branch staging; smoke tests de compra completa passando no staging.
- [ ] GitHub Environments `staging` e `production` com env vars separadas e sem sobreposição de segredos.
- [ ] Os 4 runbooks em `docs/infrastructure/runbooks/` atualizados para NestJS + Next.js + Railway + Vercel (3 atualizados + `payment-failure.md` criado).
- [ ] `docs/development/MIGRATION-COMPLETE.md` criado com sumário da migração Vinext→NestJS+Next.js, decisões tomadas e lessons learned.
- [ ] `docs/development/GO-LIVE-CHECKLIST.md` criado e completado com todos os itens marcados.
- [ ] `CHANGELOG.md` com `[Unreleased]` promovido para versão datada `[2026-04-XX] — Sprint 014–020 — Feature + Migration`.
- [ ] Go-live realizado: DNS/URL oficial apontando para Vercel + Railway; Sentry e logs monitorados por 24h pós-go-live.

---

## 5. Dependências e Sequenciamento

### Dependências de entrada
- [ ] Sprint 019 concluída: NestJS em Railway e Next.js em Vercel deployados e respondendo.
- [ ] Conta Sentry criada com dois projetos: `ticketflow-backend` (Node.js) e `ticketflow-web` (Next.js).
- [ ] Acesso ao Railway para criar serviço de staging e configurar health check.
- [ ] Acesso ao Neon para criar branch `staging` do banco.
- [ ] `SENTRY_DSN` e `NEXT_PUBLIC_SENTRY_DSN` disponíveis para configuração nas variáveis de ambiente.

### Ordem macro recomendada
1. Discovery: verificar estado atual de logs, confirmar versões de `@sentry/nestjs` e `@sentry/nextjs`, mapear estrutura de módulos NestJS existente.
2. Design de comportamento: definir contratos de `LoggerService`, contrato do endpoint `/api/health`, definir thresholds de Lighthouse para CI.
3. RED tests: testes do health check (200 OK e 503), testes do `LoggerService`, testes de correlação de request-id.
4. Implementação: PROD-001 (Sentry NestJS) → PROD-003 (Winston) → PROD-004 (health check) → PROD-009 (staging) → PROD-014 (go-live checklist).
5. Refatoração: garantir que todos os `console.log` foram substituídos, verificar consistência de formato de log.
6. Validação e rollout: smoke tests no staging, Lighthouse CI, go-live checklist, go-live.

### Paralelização possível
- PROD-002 (Sentry Next.js) em paralelo com PROD-001 (Sentry NestJS) — fronteiras separadas.
- PROD-005, PROD-006, PROD-007 (performance frontend/backend) — independentes entre si.
- PROD-012 e PROD-013 (documentação) — paralelos ao trabalho de infra.
- PROD-010 (secrets management) — paralelo ao PROD-009 (staging).

### Caminho crítico
- PROD-001 → PROD-003 → PROD-004 → PROD-009 → PROD-014 → PROD-015 (go-live)

---

## 6. Etapa 1 — Discovery Técnico

### Objetivo
Mapear o estado atual do NestJS backend e do Next.js frontend em relação a logging, error tracking e performance antes de qualquer mudança.

### Checklist
- [ ] Inspecionar `packages/backend/src/app.module.ts` para entender estrutura de módulos e ponto de inserção do `SentryModule`.
- [ ] Buscar todas as ocorrências de `console.log`, `console.warn`, `console.error` em `packages/backend/src/` — quantificar e mapear arquivos afetados.
- [ ] Verificar se existe algum módulo de logging em `packages/backend/src/infrastructure/` ou se precisa ser criado do zero.
- [ ] Verificar versão do NestJS em uso e confirmar compatibilidade com `@sentry/nestjs` mais recente.
- [ ] Inspecionar `packages/web/next.config.ts` para entender configurações atuais e ponto de inserção do `@sentry/nextjs`.
- [ ] Verificar se `@next/bundle-analyzer` já está instalado ou se precisa ser adicionado.
- [ ] Executar `next build` em `packages/web` e verificar output de bundle size das páginas críticas.
- [ ] Verificar se existe algum endpoint de health check em `packages/backend/src/api/` ou se precisa ser criado.
- [ ] Mapear variáveis de ambiente existentes no Railway (produção) e verificar o que precisa ser duplicado para staging.
- [ ] Verificar estrutura do banco Neon e confirmar que criação de branch de staging é viável com os dados atuais.
- [ ] Inspecionar `docs/infrastructure/runbooks/` para entender estrutura e conteúdo dos 3 runbooks existentes.

### Saída esperada
- Lista de arquivos com `console.log` a substituir.
- Confirmação de versões compatíveis de `@sentry/nestjs` e `@sentry/nextjs`.
- Tamanho atual dos bundles das páginas críticas (baseline antes de PROD-005).
- Mapa de variáveis de ambiente de produção a replicar para staging.
- Lista de mudanças necessárias nos 3 runbooks existentes.

---

## 7. Etapa 2 — Design de Comportamento e Estratégia de Testes

### Objetivo
Definir contratos verificáveis para `LoggerService`, health check e integração Sentry antes de implementar qualquer módulo.

### Checklist
- [ ] Definir interface de `LoggerService`: métodos `log(message, context?)`, `warn(message, context?)`, `error(message, trace?, context?)` com request-id injetado via `AsyncLocalStorage` ou `CLS`.
- [ ] Definir contrato do `GET /api/health`: resposta `{ status: 'ok'|'error', db: 'connected'|'error', uptime: number, version: string }` — 200 quando DB ok, 503 quando DB inacessível.
- [ ] Definir comportamento do Sentry exception filter: captura qualquer `HttpException` e `Error` não tratado, adiciona contexto de request (method, url, user-id se autenticado), não expõe stack trace ao cliente.
- [ ] Definir thresholds de Lighthouse CI: LCP ≤ 2.5s, FID ≤ 100ms, CLS ≤ 0.1 — configurados como `assert` no `lighthouserc.js`.
- [ ] Definir contrato de request-id: gerado pelo middleware como UUID v4 ao receber o request, propagado no header `X-Request-Id` da response e injetado em todos os logs do ciclo de vida do request.
- [ ] Confirmar que health check não requer autenticação — endpoint público para Railway health probe.
- [ ] Confirmar que Sentry não intercepta erros de validação esperados (400, 422) — apenas 5xx são alertas críticos.

### Casos de teste planejados
- [ ] Cenário 1: `GET /api/health` retorna 200 com `{ status: 'ok', db: 'connected' }` quando banco responde ao `SELECT 1`.
- [ ] Cenário 2: `GET /api/health` retorna 503 com `{ status: 'error', db: 'error' }` quando `DATABASE_URL` é inválida ou banco inacessível.
- [ ] Cenário 3: Exception filter global captura `Error` não tratado e registra no Sentry sem expor stack trace ao cliente (resposta é `{ message: 'Internal server error' }`).
- [ ] Cenário 4: `LoggerService.log('evento criado', { requestId, eventId })` produz JSON com campos `level`, `message`, `context`, `requestId`, `timestamp`.
- [ ] Edge case 1: Request sem header `X-Request-Id` — middleware gera novo UUID; request com header existente propaga o valor recebido.
- [ ] Regressão 1: Smoke tests de compra completa passam no staging environment após PROD-009.

### Matriz de testes
| Tipo | Escopo | Obrigatório? | Observações |
|------|--------|--------------|-------------|
| Unitário | `LoggerService`, `HealthController`, request-id middleware | Sim | TDD-first |
| Integração | `GET /api/health` (DB ok e DB erro), Sentry exception filter | Sim | NestJS testing module |
| E2E | Smoke scripts no staging (purchase, checkin, admin) | Sim | `scripts/smoke/*.ts --env=staging` |
| Regressão | Fluxos de compra e check-in sem regressão pós-hardening | Sim | Garantir que logging não bloqueia requests |
| Lighthouse CI | LCP, FID, CLS nas 3 páginas críticas | Sim | Bloqueia PR se acima do threshold |

---

## 8. Etapa 3 — Testes Primeiro (TDD)

### Objetivo
Criar testes RED para os comportamentos críticos antes de implementar qualquer módulo de observabilidade ou infra.

### Checklist
- [ ] Escrever teste de integração para `GET /api/health` — 200 com DB mockado como saudável.
- [ ] Escrever teste de integração para `GET /api/health` — 503 com DB mockado como inacessível.
- [ ] Escrever teste unitário para `LoggerService.log` — verifica output JSON com campos obrigatórios.
- [ ] Escrever teste do middleware de request-id — verifica que `X-Request-Id` é adicionado à response e que UUID é gerado quando não fornecido.
- [ ] Escrever teste do exception filter global — lança `Error` não tratado, verifica que resposta ao cliente é `{ message: 'Internal server error' }` e que `Sentry.captureException` foi chamado.
- [ ] Confirmar que todos os testes falham pelo motivo correto (módulos não existem ainda) antes de avançar para implementação.

### Testes a implementar primeiro
- [ ] Teste de integração: `HealthController` — `GET /api/health` retorna 200 com `{ status: 'ok', db: 'connected' }`.
- [ ] Teste de integração: `HealthController` — `GET /api/health` retorna 503 com `{ status: 'error', db: 'error' }` quando DB falha.
- [ ] Teste unitário: `LoggerService` — saída JSON contém `level`, `message`, `requestId`, `timestamp`.
- [ ] Teste unitário: `RequestIdMiddleware` — adiciona header `X-Request-Id` na response com UUID válido.
- [ ] Teste unitário: `SentryExceptionFilter` — chama `Sentry.captureException` e retorna `500` sem stack trace ao cliente.
- [ ] Teste de regressão: smoke script `purchase-flow.ts` retorna exit code 0 contra servidor local com Winston habilitado.

### Evidência RED
- **Comando executado:** `cd packages/backend && npm run test -- --testPathPattern=health|logger|request-id`
- **Falha esperada observada:** `Cannot find module 'src/api/health/health.controller'` e `Cannot find module 'src/infrastructure/logging/logger.service'`
- **Observações:** Confirmar que a falha é por ausência do módulo, não por erro de configuração do Jest.

---

## 9. Etapa 4 — Implementação

### Objetivo
Implementar o mínimo necessário para fazer os testes passarem respeitando a arquitetura de camadas do NestJS e sem introduzir acoplamentos novos entre domínio e infraestrutura.

### Checklist
- [ ] Instalar `@sentry/nestjs`, `@sentry/node` e configurar `SentryModule.forRoot()` em `app.module.ts`.
- [ ] Criar `packages/backend/src/infrastructure/sentry/sentry-exception.filter.ts` como global exception filter.
- [ ] Instalar `winston` e `nest-winston`; criar `packages/backend/src/infrastructure/logging/logger.service.ts` e `logging.module.ts`.
- [ ] Criar middleware de request-id em `packages/backend/src/infrastructure/logging/request-id.middleware.ts`; registrar em `AppModule`.
- [ ] Criar `packages/backend/src/api/health/health.controller.ts` com `GET /api/health`; testar conexão DB com `SELECT 1` via Drizzle.
- [ ] Substituir todos os `console.log/warn/error` por chamadas ao `LoggerService` nos módulos afetados.
- [ ] Instalar `@sentry/nextjs`; criar `packages/web/sentry.client.config.ts` e `packages/web/sentry.server.config.ts`; atualizar `packages/web/next.config.ts` com `withSentryConfig`.
- [ ] Instalar `@next/bundle-analyzer`; configurar modo `ANALYZE=true` em `packages/web/next.config.ts`.
- [ ] Auditar e refatorar imagens de eventos para usar `next/image` em `packages/web`.
- [ ] Adicionar `Cache-Control: stale-while-revalidate=60` nos controllers de `GET /events` e `GET /events/:slug` no NestJS.
- [ ] Criar `.github/workflows/lighthouse.yml` com Lighthouse CI bloqueando PRs com LCP > 2.5s ou CLS > 0.1.
- [ ] Criar `railway.staging.json` e configurar GitHub Environment `staging` com env vars de staging.
- [ ] Criar branch `staging` no Neon com dados mascarados (PII removido).
- [ ] Criar `packages/backend/src/api/health/health.module.ts` e registrar em `AppModule`.
- [ ] Configurar PgBouncer via string de conexão do Neon com `pgbouncer=true&connection_limit=5` no staging.
- [ ] Atualizar os 3 runbooks existentes e criar `docs/infrastructure/runbooks/payment-failure.md`.
- [ ] Criar `docs/development/MIGRATION-COMPLETE.md` com sumário da migração.
- [ ] Criar `docs/development/GO-LIVE-CHECKLIST.md` com todos os itens verificáveis.
- [ ] Promover `[Unreleased]` no `CHANGELOG.md` para versão datada.

### Regras obrigatórias
- `LoggerService` deve ser injetável via DI do NestJS — não um singleton global.
- Exception filter global deve registrar no Sentry mas nunca expor stack trace interno ao cliente.
- Health check não requer autenticação — é um endpoint público para probes de infraestrutura.
- `next/image` deve ter `sizes` configurado corretamente para não gerar requisições desnecessárias.
- Nenhuma regra de negócio em controllers ou middlewares de logging.
- Staging deve ser isolado de produção a nível de banco, backend e frontend — sem compartilhamento de recursos.

### Mudanças previstas
- **Backend:** `SentryModule`, `LoggingModule`, `HealthModule`, `RequestIdMiddleware`, `SentryExceptionFilter`; substituição de `console.log`; cache headers em GET routes.
- **API:** Novo endpoint `GET /api/health` (público).
- **Frontend:** `sentry.client.config.ts`, `sentry.server.config.ts`, `next.config.ts` atualizado; imagens migradas para `next/image`.
- **Banco/Schema:** Branch `staging` do Neon criada; string de conexão com PgBouncer configurada.
- **Infra/Config:** `.github/workflows/lighthouse.yml`, `railway.staging.json`, GitHub Environments `staging`/`production` com secrets separados.
- **Docs:** 4 runbooks, `MIGRATION-COMPLETE.md`, `GO-LIVE-CHECKLIST.md`, `CHANGELOG.md`.

---

## 10. Etapa 5 — Refatoração

### Objetivo
Garantir que os módulos de logging e observabilidade sejam coesos, sem duplicação, e que os `console.log` tenham sido completamente eliminados.

### Checklist
- [ ] Verificar com `grep -r "console\.log" packages/backend/src/` que não restam ocorrências não migradas.
- [ ] Verificar que `LoggerService` tem interface estável e não vaza detalhes de implementação do Winston para os módulos que o consomem.
- [ ] Verificar que `SentryExceptionFilter` e `LoggingModule` são independentes — logging não depende do Sentry e vice-versa.
- [ ] Revisar `health.controller.ts` para garantir que a lógica de teste de DB está no serviço, não no controller.
- [ ] Confirmar que cache headers são adicionados via interceptor ou decorator, não inline no controller.
- [ ] Garantir que todos os testes continuam verdes após refatoração.
- [ ] Verificar que bundles das páginas críticas estão abaixo de 200KB após PROD-005 e PROD-006.

### Saída esperada
- Zero ocorrências de `console.log` em `packages/backend/src/`.
- `LoggerService` com interface limpa consumível por qualquer módulo via DI.
- Testes unitários e de integração 100% verdes.
- Bundles abaixo do budget em todas as 3 páginas críticas.

---

## 11. Etapa 6 — Validação, QA e Rollout

### Testes obrigatórios finais
- [ ] Executar suíte de testes unitários e de integração do backend.
- [ ] Executar `next build` e verificar bundle sizes com `ANALYZE=true`.
- [ ] Executar Lighthouse CI localmente (`npx lhci autorun`) contra a build de produção do Next.js.
- [ ] Executar smoke scripts no staging: `purchase-flow.ts`, `checkin-flow.ts`, `admin-flow.ts`.
- [ ] Executar checklist manual de homologação (seção 13).
- [ ] Verificar Sentry: forçar erro intencional em produção e confirmar que aparece no dashboard Sentry com stack trace e contexto de request.
- [ ] Verificar Railway logs: `GET /api/events` deve mostrar request-id consistente em todos os logs do mesmo request.
- [ ] Validar `GET /api/health` retornando 200 na URL de produção Railway.
- [ ] Completar go-live checklist em `docs/development/GO-LIVE-CHECKLIST.md`.

### Comandos finais
```bash
# Backend tests
cd packages/backend && npm run test
cd packages/backend && npm run build

# Frontend build e bundle analysis
cd packages/web && next build
cd packages/web && ANALYZE=true next build

# Lighthouse CI
npx lhci autorun

# Smoke tests no staging
node scripts/smoke/purchase-flow.ts --env=staging
node scripts/smoke/checkin-flow.ts --env=staging
node scripts/smoke/admin-flow.ts --env=staging

# Verificar health check em produção
curl -s https://api.ticketflow.railway.app/api/health | jq .

# Lint e typecheck
cd packages/backend && npm run lint
cd packages/web && npm run lint
```

### Rollout
- **Estratégia de deploy:** Incremental por categoria — observabilidade primeiro (PROD-001 a PROD-004), depois performance (PROD-005 a PROD-008), depois infra de staging (PROD-009 a PROD-011), depois docs e go-live (PROD-012 a PROD-015). Cada merge passa pelo pipeline de CI.
- **Uso de feature flag:** Não necessário. Sentry e Winston são transparentes para o fluxo de usuário. Health check é endpoint novo sem breaking change.
- **Plano de monitoramento pós-release:** Monitorar dashboard Sentry por 24h após go-live. Verificar Railway logs de erros por 24h. Lighthouse CI rodando em cada PR a partir deste ponto.
- **Métricas a observar:** Taxa de erros Sentry (deve ser zero após smoke tests); latência de `GET /api/health` (< 100ms); Core Web Vitals no Vercel Analytics.
- **Alertas esperados:** Nenhum alerta novo esperado — os módulos são transparentes para usuários. Sentry emitirá alerta se qualquer exceção não tratada ocorrer em produção.

### Responsáveis
- **Backend:** @jeandias
- **Frontend:** @jeandias
- **QA:** @jeandias
- **Produto:** @jeandias
- **Release/Deploy:** @jeandias

### Janela de deploy
- **Horário recomendado:** Horário comercial, após todos os smoke tests de staging passando e go-live checklist completo.
- **Tempo de monitoramento:** 24h após go-live oficial.

---

## 12. Checkpoints do Agent OS

- [ ] Checkpoint 1 — Discovery validado: estado atual de logging e bundle sizes documentado; versões de Sentry confirmadas; mapa de variáveis de ambiente pronto.
- [ ] Checkpoint 2 — Estratégia de testes aprovada: contratos de `LoggerService`, `HealthController` e exception filter definidos; casos de teste listados.
- [ ] Checkpoint 3 — RED tests concluídos: testes de health check, logger e request-id falhando pelos motivos corretos.
- [ ] Checkpoint 4 — GREEN alcançado: todos os testes passando; Sentry, Winston e health check funcionais; `console.log` eliminado.
- [ ] Checkpoint 5 — Refatoração concluída: interfaces limpas, sem duplicação, bundles dentro do budget.
- [ ] Checkpoint 6 — Validação final concluída: smoke tests no staging passando; Lighthouse CI verde; go-live checklist completado; produto em produção.

### Log resumido dos checkpoints
| Checkpoint | Responsável | Resultado | Observações |
|-----------|-------------|-----------|-------------|
| 1 — Discovery | @jeandias | ⏳ Pendente | |
| 2 — Testes | @jeandias | ⏳ Pendente | |
| 3 — RED | @jeandias | ⏳ Pendente | |
| 4 — GREEN | @jeandias | ⏳ Pendente | |
| 5 — Refactor | @jeandias | ⏳ Pendente | |
| 6 — Validação | @jeandias | ⏳ Pendente | |

---

## 13. Checklist de Homologação

| Cenário | Resultado esperado | Evidência | Status |
| ------- | ------------------ | --------- | ------ |
| `GET /api/health` com DB saudável | 200 `{ status: 'ok', db: 'connected', uptime, version }` em < 100ms | Output de `curl -s .../api/health` | ⬜ |
| `GET /api/health` com DATABASE_URL inválida | 503 `{ status: 'error', db: 'error' }` | Output de `curl -v .../api/health` com env inválida | ⬜ |
| Erro intencional em produção | Aparece no Sentry com stack trace, contexto de request e sem expor detalhes ao cliente | Screenshot do Sentry dashboard | ⬜ |
| `GET /api/events` em produção | Railway logs mostram `requestId` consistente em todos os logs do mesmo request | Screenshot dos logs do Railway | ⬜ |
| Smoke test de compra completa no staging | Exit code 0; log de confirmação de pedido criado | Output de `purchase-flow.ts --env=staging` | ⬜ |
| Smoke test de check-in no staging | Exit code 0; log de check-in realizado com sucesso | Output de `checkin-flow.ts --env=staging` | ⬜ |
| Smoke test de admin no staging | Exit code 0; log de evento criado pelo admin | Output de `admin-flow.ts --env=staging` | ⬜ |
| Lighthouse CI em `/` | LCP < 2.5s, FID < 100ms, CLS < 0.1 | Report HTML do `lhci autorun` | ⬜ |
| Lighthouse CI em `/eventos/[slug]` | LCP < 2.5s, FID < 100ms, CLS < 0.1 | Report HTML do `lhci autorun` | ⬜ |
| Lighthouse CI em `/checkout` | LCP < 2.5s, FID < 100ms, CLS < 0.1 | Report HTML do `lhci autorun` | ⬜ |
| Bundle analyzer em `/` | JS parsed < 200KB | Screenshot do bundle analyzer | ⬜ |
| Bundle analyzer em `/eventos/[slug]` | JS parsed < 200KB | Screenshot do bundle analyzer | ⬜ |
| Bundle analyzer em `/checkout` | JS parsed < 200KB | Screenshot do bundle analyzer | ⬜ |
| Go-live checklist | Todos os itens marcados em `GO-LIVE-CHECKLIST.md` | Arquivo commitado com checkboxes marcados | ⬜ |

---

## 14. Plano de Rollback

### Gatilhos
- Sentry reportando taxa de erros acima de zero para erros 5xx nos primeiros 30 minutos após go-live.
- `GET /api/health` retornando 503 em produção por mais de 2 minutos consecutivos.
- Smoke tests de compra falhando em produção.
- Lighthouse CI reportando regressão em Core Web Vitals após go-live.
- Comportamento divergente do esperado apesar de smoke tests verdes no staging.

### Passos
1. Reverter DNS/URL oficial para Cloudflare Workers (stack Vinext — mantido como fallback por 7 dias após go-live).
2. Comunicar no repositório a reversão com causa registrada.
3. Executar smoke tests contra o Vinext/Cloudflare para confirmar estabilidade do fallback.
4. Diagnosticar causa raiz do problema no NestJS/Vercel stack.
5. Abrir task de pós-mortem antes de re-tentar o go-live.

### Responsáveis
- **Execução técnica:** @jeandias
- **Revalidação:** @jeandias
- **Comunicação:** @jeandias

### RTO
- Até 30 minutos (reversão de DNS para Cloudflare Workers Vinext).

---

## 15. Critérios de Aceite

- [ ] Todos os cenários críticos foram cobertos por testes (health check, logging, exception filter).
- [ ] Os testes foram escritos antes da implementação (TDD).
- [ ] A implementação atende ao comportamento esperado definido na seção 7.
- [ ] Não houve regressão nos fluxos de compra, check-in e admin.
- [ ] `console.log` completamente eliminado de `packages/backend/src/` (verificado por `grep`).
- [ ] Sentry ativo em NestJS e Next.js com DSNs configuradas nos ambientes de produção.
- [ ] Health check retornando 200 em produção e 503 simulado com DB inválido.
- [ ] Staging funcional com smoke tests 100% passando.
- [ ] Checklist manual de homologação (seção 13) executado com todos os itens confirmados.
- [ ] Go-live checklist completado e documentado em `GO-LIVE-CHECKLIST.md`.
- [ ] Rollback definido com RTO de 30 minutos (Vinext como fallback disponível).
- [ ] Documentação final entregue: runbooks, `MIGRATION-COMPLETE.md`, `GO-LIVE-CHECKLIST.md`, `CHANGELOG.md`.
- [ ] Critérios de sucesso da seção 4 todos marcados.

---

## 16. Definition of Done

A sprint só pode ser considerada concluída quando:

- [ ] Sentry operacional em NestJS e Next.js — erros capturados e visíveis no dashboard.
- [ ] Winston logging operacional — logs estruturados JSON com request-id em produção.
- [ ] `GET /api/health` retornando 200 em produção com latência < 100ms.
- [ ] Core Web Vitals dentro dos thresholds em todas as 3 páginas críticas (Lighthouse CI verde).
- [ ] Bundles das páginas críticas abaixo de 200KB JS parsed.
- [ ] Staging environment funcional: Railway staging + Vercel preview + Neon staging branch.
- [ ] GitHub Environments `staging` e `production` com secrets separados e sem sobreposição.
- [ ] Smoke tests passando 100% no staging para os 3 fluxos críticos.
- [ ] 4 runbooks atualizados para NestJS + Next.js + Railway + Vercel.
- [ ] `MIGRATION-COMPLETE.md` criado com sumário completo da migração Vinext→NestJS+Next.js.
- [ ] `GO-LIVE-CHECKLIST.md` completado e commitado.
- [ ] `CHANGELOG.md` com versão datada cobrindo sprints 014–020.
- [ ] Go-live realizado: produto em produção real, monitorado por 24h.
- [ ] Vinext/Cloudflare Workers mantido como fallback por 7 dias e depois aposentado formalmente.
- [ ] Sem violação arquitetural crítica introduzida.
- [ ] Sem blocker aberto.

---

## 17. Instrução padrão para AGENTS.md

```text
When generating new sprints for this application, always follow the official Sprint Template.

This application is TDD-first and Agent-OS-driven.

Mandatory rules:
- tests come before implementation
- every feature, fix, or refactor must define expected behavior first
- every implementation must have corresponding automated tests
- regression fixes must include regression tests
- backend validation and data integrity must be prioritized
- do not generate implementation-only sprints
- every sprint must include discovery, behavior design, test strategy, test-first execution, implementation, refactor, QA, validation, and rollback
- when useful, split work into parallelizable execution batches
- preserve the current architecture and codebase conventions
- do not generate generic sprint content

Always keep the sprint specific to the current codebase and architecture.
Follow the sprint template exactly.
```
