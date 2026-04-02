---
title: Task Board — Fase 019: Vinext → NestJS API Integration
type: phase-task-board
mode: execution-tracking
status: draft
---

# 🚀 Tasks — Fase 019: Vinext → NestJS API Integration

**Status:** 🟡 Planejada
**Última atualização:** 2026-04-02
**Sprint Atual:** Sprint 019
**Modo principal:** frontend
**Status Geral:** ⏳ 0% (0/13 tarefas completas) — FASE PLANEJADA
**ETA:** 1.5 semanas
**Pré-requisito:** Fase 018 — NestJS Backend Extraction ✅ (NestJS rodando no Render com URL pública)
**Owner:** @jeandias
**Docs relacionadas:** `docs/development/SPRINTS/SPRINT-019.md`, `docs/development/MIGRATION-PLAN.md`

---

## 📊 Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| CORS & Session | 2 | 0 | 0 | 2 | 0 |
| API Client | 1 | 0 | 0 | 1 | 0 |
| Chamadas por Domínio | 5 | 0 | 0 | 5 | 0 |
| Auth Cross-Origin | 1 | 0 | 0 | 1 | 0 |
| Limpeza & Config | 2 | 0 | 0 | 2 | 0 |
| Tests & Deploy | 2 | 0 | 0 | 2 | 0 |
| **TOTAL** | **13** | **0** | **0** | **13** | **0** |

### 🎯 Principais Indicadores
- ⏳ Fase planejada — aguardando Sprint 018
- 🔴 Dependência: NestJS no Render com URL configurada e CORS aceitando Cloudflare Workers
- 🧪 Meta: 514 integration tests passando contra NestJS; smoke tests 100% no stack integrado
- 📦 Entrega: Vinext/Cloudflare Workers sem handlers internos de API — tudo roteado para NestJS Render

---

## 🎯 Objetivos da Fase

- Configurar CORS e sessão cross-origin entre Cloudflare Workers e NestJS Render
- Criar `src/lib/api-client.ts` como único ponto de saída HTTP para o NestJS
- Migrar todas as chamadas de API internas do Vinext para `apiFetch` apontando ao NestJS
- Validar sessão Better Auth funcionando cross-origin (`SameSite=None; Secure`)
- Remover handlers internos do Vinext que foram portados ao NestJS
- Deploy Cloudflare Workers com `API_BASE_URL` configurada

---

## 🗺️ Dependências, Batches e Caminho Crítico

### Dependências macro
- Sprint 018 completa: NestJS no Render com URL conhecida
- `API_BASE_URL` (Render URL) disponível como secret no GitHub Actions
- Better Auth com `trustedOrigins` incluindo o domínio Cloudflare Workers (Sprint 018)

### Caminho crítico
1. VINX-001 (CORS no NestJS)
2. VINX-002 (API client no Vinext)
3. VINX-008 (sessão cross-origin)
4. VINX-003 + VINX-004 (chamadas events + orders — mais críticas)
5. VINX-011 (integration tests)
6. VINX-013 (deploy Cloudflare Workers)

### Paralelização possível
- VINX-003, VINX-004, VINX-005 (chamadas events/orders/checkin) em paralelo após VINX-002 + VINX-008
- VINX-006, VINX-007 (admin + coupons) em paralelo com checkin
- VINX-010 (wrangler config) pode ser preparado cedo
- VINX-012 (smoke tests) após VINX-003 a VINX-007

### Checkpoints
- [ ] CORS + sessão validados — requests cross-origin funcionando sem erro no browser
- [ ] API client criado e testado
- [ ] Todos os 5 domínios de chamada migrados
- [ ] Integration tests passando contra NestJS
- [ ] Smoke tests 100% no stack integrado
- [ ] Deploy Cloudflare Workers com `API_BASE_URL` de produção

---

## 📦 Estrutura de Categorias

---

### 📦 CORS & Session — Prerequisitos cross-origin

#### Objetivo
Configurar CORS no NestJS para aceitar o domínio do Cloudflare Workers e validar que cookies de sessão do Better Auth funcionam cross-origin antes de qualquer chamada de UI ser migrada.

---

- [ ] **VINX-001** — Atualizar CORS no NestJS para aceitar domínio(s) Cloudflare Workers

  **Modo recomendado:** backend
  **Tipo:** config

  **Descrição curta:**
  - Atualizar `app.enableCors()` em `packages/backend/src/main.ts` com origin(s) do Cloudflare Workers (produção + preview)
  - Habilitar `credentials: true` para suporte a cookies cross-origin
  - Adicionar domínio Cloudflare Workers em `trustedOrigins` do Better Auth config

  **Contexto mínimo:**
  - Domínio de produção: `https://<projeto>.workers.dev` ou domínio customizado
  - Preview: `https://<hash>.<projeto>.workers.dev`
  - Sem `credentials: true`, cookies não são enviados pelo browser

  **Arquivos/áreas afetadas:** `packages/backend/src/main.ts`, Better Auth config no NestJS

  **Critérios de aceitação:**
  - [ ] Request do Cloudflare Workers para `GET /api/events` não retorna erro CORS
  - [ ] Header `Access-Control-Allow-Credentials: true` presente nas respostas
  - [ ] `OPTIONS` preflight retorna 204 com headers corretos

  **Estratégia de teste:**
  - [ ] Integração: request com `Origin: https://<workers-domain>` retorna headers CORS corretos
  - [ ] Regressão: CORS não quebra requests sem Origin (e.g. testes de integração)

  **Dependências:** Sprint 018 completa
  **Bloqueia:** VINX-008 (sessão), VINX-003 a VINX-007 (chamadas de UI)
  **Pode rodar em paralelo com:** VINX-002

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Teste de CORS verde
  - [ ] Sem erro de CORS no browser

---

- [ ] **VINX-008** — Validar sessão Better Auth cross-origin (`SameSite=None; Secure`)

  **Modo recomendado:** backend
  **Tipo:** config

  **Descrição curta:**
  - Verificar/configurar cookie de sessão do Better Auth com `SameSite=None; Secure` para funcionar cross-origin
  - Confirmar que `credentials: 'include'` no `apiFetch` envia o cookie para o NestJS
  - Testar login → request autenticado → logout em browser real

  **Contexto mínimo:**
  - Cookies `SameSite=Lax` (padrão) não são enviados em requisições cross-origin
  - Requer `SameSite=None; Secure` — somente funciona em HTTPS
  - Em dev local, pode ser necessário usar `SameSite=Lax` com proxy ou tunneling (ex: `cloudflared`)

  **Arquivos/áreas afetadas:** Better Auth config no NestJS, `apiFetch` no Vinext

  **Critérios de aceitação:**
  - [ ] Login no Vinext cria sessão no NestJS; cookie retornado com `SameSite=None; Secure`
  - [ ] Requests subsequentes com `credentials: 'include'` enviam o cookie e recebem resposta autenticada
  - [ ] Logout invalida a sessão no NestJS

  **Estratégia de teste:**
  - [ ] Integração: login via Vinext, request autenticado para `/api/orders/mine`, logout
  - [ ] Auth/AuthZ: request sem cookie retorna 401

  **Dependências:** VINX-001, VINX-002
  **Bloqueia:** VINX-003 a VINX-007 (fluxos autenticados)
  **Pode rodar em paralelo com:** VINX-003 (fluxos públicos)

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Sessão cross-origin funcionando em browser real
  - [ ] Cookie com atributos corretos confirmado via DevTools

---

### 📦 API Client — Abstração HTTP centralizada

---

- [ ] **VINX-002** — Criar `src/lib/api-client.ts` — `apiFetch` centralizado para NestJS

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Criar `src/lib/api-client.ts` com função `apiFetch(path, options?)`
  - Compor URL com `API_BASE_URL` env (injetada pelo Cloudflare Workers via `wrangler.toml`)
  - Sempre incluir `credentials: 'include'` e `Content-Type: application/json`
  - Tratar erros HTTP: 401 lança `UnauthorizedError`, 403 lança `ForbiddenError`, 5xx lança `ApiError`

  **Contexto mínimo:**
  - `API_BASE_URL` disponível como variável de ambiente no Cloudflare Workers runtime
  - Vinext expõe variáveis de ambiente via `context.env` ou `import.meta.env` (verificar no discovery)
  - Error shapes do NestJS: `{ statusCode, message, error }`

  **Implementação sugerida:**
  ```ts
  export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${path}`;
    const res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    if (!res.ok) handleHttpError(res.status);
    return res.json();
  }
  ```

  **Arquivos/áreas afetadas:** `src/lib/api-client.ts` (novo)

  **Critérios de aceitação:**
  - [ ] `apiFetch('/api/events')` resolve para `${API_BASE_URL}/api/events`
  - [ ] Sempre inclui `credentials: 'include'`
  - [ ] Resposta 401 lança erro com code `'unauthorized'`
  - [ ] Resposta 403 lança erro com code `'forbidden'`
  - [ ] Unitário verde antes de qualquer migração de chamada

  **Estratégia de teste:**
  - [ ] Unitário: URL composition, credentials, error handling para cada status code

  **Dependências:** VINX-001
  **Bloqueia:** VINX-003 a VINX-007
  **Pode rodar em paralelo com:** VINX-001

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes unitários passando

---

### 📦 Chamadas por Domínio — Migração de fetch interno → apiFetch

#### Objetivo
Migrar cada domínio de chamada de API do Vinext (eventos, orders, checkin, admin, coupons) para usar `apiFetch`, garantindo paridade de comportamento com os handlers internos.

---

- [ ] **VINX-003** — Migrar chamadas de eventos para `apiFetch`

  **Modo recomendado:** frontend
  **Tipo:** refactor

  **Descrição curta:**
  - `GET /api/events` (listagem pública com filtros)
  - `GET /api/events/:slug` (detalhe do evento)
  - `POST /api/events` (criar evento — admin)
  - `PATCH /api/events/:slug/status` (atualizar status — organizer/admin)
  - `GET /api/events/:slug/analytics` (métricas — organizer/admin)

  **Arquivos/áreas afetadas:** Componentes/loaders de listagem, detalhe de evento e admin no `src/app/`

  **Critérios de aceitação:**
  - [ ] Listagem pública funciona sem sessão
  - [ ] Detalhe de evento carrega lotes ativos
  - [ ] Criar evento requer sessão de organizer; retorna 403 para customer
  - [ ] Nenhuma chamada interna a handler de evento permanece

  **Estratégia de teste:**
  - [ ] Integração: `GET /api/events` e `GET /api/events/:slug` via NestJS
  - [ ] Auth/AuthZ: `POST /api/events` sem sessão retorna 401

  **Dependências:** VINX-002
  **Bloqueia:** VINX-011
  **Pode rodar em paralelo com:** VINX-004, VINX-005

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Todos os endpoints de eventos usando `apiFetch`
  - [ ] Integração verificada

---

- [ ] **VINX-004** — Migrar chamadas de orders para `apiFetch`

  **Modo recomendado:** frontend
  **Tipo:** refactor

  **Descrição curta:**
  - `POST /api/orders` (criar pedido — customer)
  - `GET /api/orders/mine` (meus ingressos — customer)
  - `POST /api/orders/:id/simulate-payment` (modo demo)

  **Arquivos/áreas afetadas:** Página de checkout, meus ingressos

  **Critérios de aceitação:**
  - [ ] Checkout cria pedido no NestJS e redireciona para Stripe (ou simulação)
  - [ ] Meus ingressos carrega tickets com QR codes
  - [ ] Pedido criado com preço calculado server-side (NestJS) — nunca no frontend

  **Estratégia de teste:**
  - [ ] Integração: `POST /api/orders` retorna `checkoutUrl`
  - [ ] Regressão: `GET /api/orders/mine` retorna tickets com tokens válidos

  **Dependências:** VINX-002, VINX-008
  **Bloqueia:** VINX-011
  **Pode rodar em paralelo com:** VINX-003, VINX-005

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Chamadas de orders usando `apiFetch`
  - [ ] Fluxo de checkout ponta a ponta funcionando

---

- [ ] **VINX-005** — Migrar chamadas de checkin para `apiFetch`

  **Modo recomendado:** frontend
  **Tipo:** refactor

  **Descrição curta:**
  - `POST /api/checkin` (validar ticket — checker)

  **Arquivos/áreas afetadas:** Página de checkin, `CheckinForm`

  **Critérios de aceitação:**
  - [ ] QR scan ou input manual envia ticket token para NestJS
  - [ ] NestJS valida ticket e retorna status de entrada
  - [ ] Ticket já usado retorna erro estruturado com mensagem amigável

  **Estratégia de teste:**
  - [ ] Integração: `POST /api/checkin` com token válido retorna sucesso
  - [ ] Regressão: ticket já usado retorna 409

  **Dependências:** VINX-002, VINX-008
  **Bloqueia:** VINX-011
  **Pode rodar em paralelo com:** VINX-003, VINX-004

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Chamada de checkin usando `apiFetch`
  - [ ] Fluxo de checkin funcionando com NestJS

---

- [ ] **VINX-006** — Migrar chamadas de admin (lots + listEventOrders) para `apiFetch`

  **Modo recomendado:** frontend
  **Tipo:** refactor

  **Descrição curta:**
  - `POST /api/lots`, `PUT /api/lots/:id` (criar/atualizar lotes — organizer)
  - `GET /api/events/:slug/orders` (listar pedidos do evento — organizer/admin)

  **Arquivos/áreas afetadas:** Admin dashboard, formulários de lote

  **Critérios de aceitação:**
  - [ ] Organizer cria e edita lotes via NestJS
  - [ ] Admin visualiza pedidos por evento
  - [ ] Endpoints retornam 403 para roles não autorizados

  **Estratégia de teste:**
  - [ ] Auth/AuthZ: customer acessando endpoints de organizer retorna 403
  - [ ] Integração: criar lote e verificar no banco

  **Dependências:** VINX-002, VINX-008
  **Bloqueia:** VINX-011
  **Pode rodar em paralelo com:** VINX-003, VINX-004, VINX-005

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Chamadas de admin usando `apiFetch`
  - [ ] RBAC de organizer/admin validado

---

- [ ] **VINX-007** — Migrar chamadas de coupons para `apiFetch`

  **Modo recomendado:** frontend
  **Tipo:** refactor

  **Descrição curta:**
  - `POST /api/coupons` (criar cupom — organizer/admin)
  - `PUT /api/coupons/:id` (atualizar cupom — organizer/admin)

  **Arquivos/áreas afetadas:** Admin dashboard — seção de cupons

  **Critérios de aceitação:**
  - [ ] Organizer cria e atualiza cupons via NestJS
  - [ ] Cupons inválidos retornam erro estruturado

  **Estratégia de teste:**
  - [ ] Integração: criar cupom e verificar no banco

  **Dependências:** VINX-002, VINX-008
  **Bloqueia:** VINX-011
  **Pode rodar em paralelo com:** VINX-003 a VINX-006

  **Prioridade:** 🟡 Média
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Chamadas de coupons usando `apiFetch`

---

### 📦 Limpeza & Config — Handlers internos e env vars

---

- [ ] **VINX-009** — Remover handlers internos do Vinext portados ao NestJS

  **Modo recomendado:** frontend
  **Tipo:** refactor

  **Descrição curta:**
  - Remover ou desativar os route handlers do Vinext em `src/server/api/` que foram portados ao NestJS
  - Manter apenas o routing de páginas do Vinext (SSR/RSC) — sem lógica de negócio ou persistência

  **Contexto mínimo:**
  - Após esta tarefa, o Vinext Worker é exclusivamente um servidor de apresentação
  - Handlers de API não devem permanecer ativos — risco de inconsistência entre Vinext handler e NestJS
  - Remover apenas após validar que todos os fluxos cobertos pelo NestJS estão funcionando (VINX-003 a VINX-007)

  **Critérios de aceitação:**
  - [ ] `grep -r "apiHandler\|createHandler" src/server/api/` retorna apenas o roteador raiz (sem handlers de negócio)
  - [ ] Vinext não responde a `POST /api/orders` diretamente — deve ser 404 ou não registrado
  - [ ] Nenhum use-case ou repositório importado em `src/app/` diretamente

  **Estratégia de teste:**
  - [ ] Regressão: todos os fluxos continuam funcionando via NestJS após remoção

  **Dependências:** VINX-003 a VINX-007 (todos os domínios migrados)
  **Bloqueia:** VINX-013
  **Pode rodar em paralelo com:** VINX-011, VINX-012

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Handlers internos removidos
  - [ ] Testes de regressão verdes

---

- [ ] **VINX-010** — Configurar `API_BASE_URL` no `wrangler.toml` e `.dev.vars`

  **Modo recomendado:** infra
  **Tipo:** config

  **Descrição curta:**
  - Adicionar `[vars] API_BASE_URL = "https://ticketflow-api.onrender.com"` em `wrangler.toml` (produção)
  - Adicionar `API_BASE_URL=http://localhost:3001` em `.dev.vars` (desenvolvimento local)
  - Adicionar `API_BASE_URL` como GitHub Secret para o CD do Cloudflare Workers

  **Critérios de aceitação:**
  - [ ] `wrangler dev` com `.dev.vars` faz chamadas para `localhost:3001`
  - [ ] `wrangler deploy` com vars de produção faz chamadas para URL do Render
  - [ ] Secret no GitHub Actions configurado para o workflow de CD

  **Estratégia de teste:**
  - [ ] Smoke: `wrangler dev` + NestJS local respondendo corretamente

  **Dependências:** Nenhuma (pode ser feito cedo)
  **Bloqueia:** VINX-013
  **Pode rodar em paralelo com:** Todos

  **Prioridade:** 🟡 Alta
  **Estimativa:** 30min
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Vars configuradas em todos os ambientes

---

### 📦 Tests & Deploy — Validação final e deploy

---

- [ ] **VINX-011** — Adaptar integration tests para apontar ao NestJS (porta 3001)

  **Modo recomendado:** test
  **Tipo:** test

  **Descrição curta:**
  - Atualizar os 18 arquivos de integration tests para chamar NestJS HTTP (localhost:3001) em vez dos handlers internos do Vinext
  - Garantir que os 514 testes passam 100% contra NestJS

  **Critérios de aceitação:**
  - [ ] `npm run test:integration` passa 514/514 contra NestJS
  - [ ] Zero testes chamando handlers internos do Vinext

  **Estratégia de teste:**
  - [ ] N/A — esta tarefa é a criação dos testes

  **Dependências:** VINX-003 a VINX-007
  **Bloqueia:** VINX-013
  **Pode rodar em paralelo com:** VINX-009, VINX-012

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 4h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] 514 testes passando contra NestJS

---

- [ ] **VINX-012** — E2E smoke tests no stack integrado (Cloudflare Workers + NestJS Render)

  **Modo recomendado:** test
  **Tipo:** test

  **Descrição curta:**
  - Executar `scripts/smoke/purchase-flow.ts` contra Cloudflare Workers dev + NestJS local
  - Executar `scripts/smoke/checkin-flow.ts` e `scripts/smoke/admin-flow.ts`
  - Todos os scripts devem retornar exit code 0

  **Critérios de aceitação:**
  - [ ] `purchase-flow.ts` — compra completa com pagamento simulado: exit 0
  - [ ] `checkin-flow.ts` — ticket validado via NestJS: exit 0
  - [ ] `admin-flow.ts` — evento criado e publicado: exit 0

  **Dependências:** VINX-003 a VINX-007, VINX-008
  **Bloqueia:** VINX-013
  **Pode rodar em paralelo com:** VINX-011

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Todos os smoke scripts com exit 0

---

- [ ] **VINX-013** — Deploy Cloudflare Workers com `API_BASE_URL` de produção

  **Modo recomendado:** infra
  **Tipo:** deploy

  **Descrição curta:**
  - Deploy via `wrangler deploy` (ou CD) com `API_BASE_URL` apontando para NestJS Render
  - Verificar que Worker de produção faz chamadas ao NestJS Render corretamente
  - Validar smoke test rápido no ambiente de produção após deploy

  **Critérios de aceitação:**
  - [ ] `GET /` no Cloudflare Workers produção carrega lista de eventos do NestJS Render
  - [ ] Nenhum erro de CORS no browser em produção
  - [ ] Sessão cross-origin funcionando em HTTPS produção

  **Dependências:** VINX-009, VINX-010, VINX-011, VINX-012
  **Bloqueia:** Sprint 020
  **Pode rodar em paralelo com:** Nenhuma

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ⏳ Pendente

  **Definição de pronto:**
  - [ ] Deploy bem-sucedido
  - [ ] Stack integrado funcionando em produção

---

## 📋 Checklist de Encerramento da Fase

- [ ] Todos os 13 itens acima concluídos e com critérios de aceitação atendidos
- [ ] `apiFetch` como único ponto de saída HTTP para NestJS — zero handlers internos de API
- [ ] CORS e sessão cross-origin validados em browser real (HTTPS)
- [ ] Integration tests: 514/514 passando contra NestJS
- [ ] Smoke tests: 3 scripts com exit 0 no stack integrado
- [ ] `API_BASE_URL` configurada corretamente em todos os ambientes
- [ ] Diagrama de infraestrutura atualizado: `docs/infrastructure/`
- [ ] SPRINT-019.md com checkpoints marcados
- [ ] CHANGELOG.md atualizado com entrega da Fase 019
