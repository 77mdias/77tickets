# 🚀 Tasks - Fase 009: Hardening

**Status:** ✅ CONCLUÍDA
**Última atualização:** 2026-03-31
**Sprint Atual:** Sprint 009
**Status Geral:** ✅ 100% (10/10 tarefas completas)
**ETA:** 1 sprint
**Pré-requisito:** Fase 008 (admin dashboard completo)

> Esta fase corresponde à **Fase 5 (Hardening)** do ROADMAP.md original.

---

## 📊 Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Testing & Regressão | 3 | 3 | 0 | 0 | 0 |
| Observabilidade | 2 | 2 | 0 | 0 | 0 |
| Performance | 3 | 3 | 0 | 0 | 0 |
| Segurança & Docs | 2 | 2 | 0 | 0 | 0 |
| **TOTAL** | **10** | **10** | **0** | **0** | **0** |

### 🎯 Principais Indicadores
- ✅ Risco eliminado: regression gate cobre auth + compra + checkin + autorização (360 unit + 24 regression).
- ✅ Risco eliminado: audit trail implementado para `order.created`, `checkin.validated`, `event.published`.
- ✅ N+1 eliminado: `createOrder` usa `findByIds` batch; decremento de estoque corrigido e atomicamente protegido.

---

## 🎯 Objetivos da Fase

- Expandir gate de regressão automatizado para cobrir todos os fluxos críticos.
- Implementar audit trail para operações críticas (compra, checkin, publicação).
- Padronizar formato de erro em todos os handlers.
- Revisar e eliminar padrões N+1 nos principais endpoints.
- Implementar rate limiting básico nos endpoints de escrita.
- Documentar runbooks de resposta a erros para os 3 fluxos críticos.

---

## 📦 Estrutura de Categorias

### 📦 Testing & Regressão — Ampliar cobertura de testes

- [x] **HDN-001** - Expandir regression gate para fluxos críticos

  **Descrição curta:**
  - Criar/expandir testes de regressão cobrindo: auth, compra, checkin e autorização.
  - Garantir que cada fluxo crítico tem pelo menos um cenário de regressão automatizado.

  **Implementação sugerida:**
  - `tests/regression/auth/auth.regression.test.ts` — login/sessão inválida
  - Expandir `tests/regression/checkin/checkin.regression.test.ts`
  - Expandir `tests/regression/orders/order-state.regression.test.ts`
  - Expandir `tests/regression/events/publish-event.regression.test.ts`
  - Integrar ao script `test:regression`

  **Arquivos/áreas afetadas:** `tests/regression/`

  **Critérios de aceitação:**
  - [ ] Fluxo de auth cobre: sessão inválida, role incorreto, expiração.
  - [ ] Fluxo de compra cobre: estoque insuficiente, lote expirado, cupom inválido.
  - [ ] Fluxo de checkin cobre: ticket duplicado, ticket de outro evento.
  - [ ] Gate de regressão passa no CI antes de qualquer merge.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 5h
  **Dependências:** Fase 006 (auth real), Fase 007 (fluxo completo)
  **Status:** ✅ Concluído

- [x] **HDN-009** - Revisar edge cases de RBAC em testes de segurança

  **Descrição curta:**
  - Auditar testes de autorização existentes e identificar edge cases não cobertos.
  - Cenários: role switching, customer tentando acessar endpoint de organizer, checker sem evento vinculado.

  **Implementação sugerida:**
  - Revisar `tests/integration/api/*/auth.test.ts`
  - Adicionar cenários de cross-role e cross-ownership faltantes

  **Arquivos/áreas afetadas:** `tests/integration/api/`

  **Critérios de aceitação:**
  - [ ] Todos os endpoints têm pelo menos 2 cenários negativos de autorização.
  - [ ] Cross-organizer sempre bloqueado.
  - [ ] Customer não acessa rotas de organizer/admin.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Dependências:** Fase 006, Fase 008
  **Status:** ✅ Concluído

- [x] **HDN-010** - Stress test básico: concorrência no decremento de estoque

  **Descrição curta:**
  - Simular compras concorrentes no mesmo lote e verificar que o estoque não fica negativo.
  - Validar comportamento do `decrementAvailableQuantity` sob concorrência.

  **Implementação sugerida:**
  - `tests/integration/repositories/concurrency.integration.test.ts`
  - N requisições paralelas para o mesmo lote com estoque = N-1
  - Verificar que exatamente N-1 pedidos são criados

  **Arquivos/áreas afetadas:** `tests/integration/`

  **Critérios de aceitação:**
  - [ ] Estoque nunca fica negativo sob concorrência.
  - [ ] Último pedido recebe erro `INSUFFICIENT_STOCK`.
  - [ ] Teste reproduzível e determinístico.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 4h
  **Dependências:** —
  **Status:** ✅ Concluído

---

### 📦 Observabilidade — Audit trail e logging estruturado

- [x] **HDN-002** - Audit trail para operações críticas

  **Descrição curta:**
  - Logar eventos críticos de domínio de forma estruturada:
    - `order.created` (orderId, customerId, eventId, total, timestamp)
    - `checkin.validated` (ticketId, checkerId, eventId, timestamp)
    - `event.published` (eventId, organizerId, timestamp)
  - Usar a infraestrutura de observabilidade existente (`src/server/infrastructure/observability/`).

  **Implementação sugerida:**
  - Estender `checkout-observability.ts` ou criar `audit-trail.ts`
  - Chamar do use-case (não do handler) para preservar arquitetura
  - Formato JSON estruturado com campos consistentes

  **Arquivos/áreas afetadas:** `src/server/infrastructure/observability/`, use-cases críticos

  **Critérios de aceitação:**
  - [ ] Os 3 eventos críticos logados com campos padronizados.
  - [ ] Log disponível em output do servidor.
  - [ ] Sem dados sensíveis (senhas, tokens completos) no log.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 4h
  **Dependências:** —
  **Status:** ✅ Concluído

- [x] **HDN-003** - Padronizar shape de erro em todos os handlers

  **Descrição curta:**
  - Auditar todos os handlers e garantir que o shape de erro é consistente.
  - Shape: `{ error: { code: string, message: string, details?: unknown } }`.
  - Verificar que `error-mapper.ts` cobre todos os `AppError` types.

  **Implementação sugerida:**
  - Revisar `src/server/api/error-mapper.ts`
  - Garantir que nenhum handler retorna shape de erro ad hoc
  - Adicionar testes de snapshot de erro nos handlers

  **Arquivos/áreas afetadas:** `src/server/api/error-mapper.ts`, todos os handlers

  **Critérios de aceitação:**
  - [ ] Shape de erro idêntico em todos os endpoints.
  - [ ] Erros de domínio mapeados corretamente.
  - [ ] Erros de infra não vazam detalhes técnicos para o cliente.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 3h
  **Dependências:** —
  **Status:** ✅ Concluído

---

### 📦 Performance — Queries e payload

- [x] **HDN-004** - Revisar padrões N+1 nos principais endpoints

  **Descrição curta:**
  - Auditar `createOrder`, `listPublishedEvents`, `listByOrderId`, `listEventOrders`.
  - Substituir loops com queries individuais por queries com JOIN ou `IN` clause.

  **Implementação sugerida:**
  - Revisar `drizzle-order.repository.ts`, `drizzle-event.repository.ts`
  - Usar `with` (Drizzle relational queries) onde aplicável
  - Medir número de queries por operação antes e depois

  **Arquivos/áreas afetadas:** `src/server/repositories/drizzle/`

  **Critérios de aceitação:**
  - [ ] `createOrder` sem N+1 (tickets e items em batch).
  - [ ] `listPublishedEvents` com query única.
  - [ ] `listEventOrders` com JOIN em vez de loop.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 4h
  **Dependências:** Fase 007, Fase 008
  **Status:** ✅ Concluído

- [x] **HDN-005** - Payload minimization nos endpoints de listagem

  **Descrição curta:**
  - Garantir que endpoints de listagem retornam apenas campos necessários.
  - Evitar enviar colunas grandes (ex: `description` completa na listagem de eventos).

  **Implementação sugerida:**
  - `GET /api/events` retorna: id, slug, title, startsAt, imageUrl, location (sem description)
  - `GET /api/orders/mine` retorna: id, status, totalInCents, createdAt + tickets (sem detalhes de admin)
  - Definir tipos de resposta explícitos para cada endpoint

  **Arquivos/áreas afetadas:** use-cases de listagem, handlers, tipos de resposta

  **Critérios de aceitação:**
  - [ ] Sem campos desnecessários em endpoints de listagem.
  - [ ] Tipos de resposta explicitamente definidos e separados do `Record` completo.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 3h
  **Dependências:** Fase 007, Fase 008
  **Status:** ✅ Concluído

- [x] **HDN-006** - Revisar config de connection pooling para Cloudflare Workers

  **Descrição curta:**
  - Verificar se o cliente Neon está configurado corretamente para Workers (HTTP mode).
  - Cloudflare Workers não suporta TCP persistente — usar `@neondatabase/serverless` com modo HTTP.
  - Documentar configuração recomendada.

  **Implementação sugerida:**
  - Revisar `src/server/infrastructure/db/client.ts`
  - Validar que `neon` está em modo HTTP, não WebSocket (para Workers)
  - Adicionar comentário documentando decisão de config

  **Arquivos/áreas afetadas:** `src/server/infrastructure/db/client.ts`

  **Critérios de aceitação:**
  - [ ] Configuração documentada e validada para Workers.
  - [ ] Sem uso de APIs Node.js não compatíveis com Workers no caminho crítico.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Dependências:** —
  **Status:** ✅ Concluído

---

### 📦 Segurança & Docs — Rate limiting e runbooks

- [x] **HDN-007** - Rate limiting básico nos endpoints de escrita

  **Descrição curta:**
  - Implementar rate limiting nos endpoints de criação (orders, auth, checkin).
  - Para Workers: usar KV store ou middleware de rate limiting compatível com edge.

  **Implementação sugerida:**
  - Avaliar middleware de rate limiting compatível com Cloudflare Workers
  - Limites sugeridos: 10 req/min por IP para `/api/orders`, 5 req/min para `/api/auth/login`
  - Retornar `429 Too Many Requests` com `Retry-After` header

  **Arquivos/áreas afetadas:** `src/app/api/`, middleware de edge

  **Critérios de aceitação:**
  - [ ] Rate limiting ativo nos endpoints críticos.
  - [ ] `429` retornado corretamente com header `Retry-After`.
  - [ ] Sem impacto em testes existentes (excluir testes do rate limiting).

  **Prioridade:** 🟡 Alta
  **Estimativa:** 3h
  **Dependências:** Fase 006
  **Status:** ✅ Concluído

- [x] **HDN-008** - Documentar runbooks de erro para os 3 fluxos críticos

  **Descrição curta:**
  - Criar runbooks operacionais para: falha no checkout, falha no checkin, falha de auth.
  - Cada runbook: sintoma → causa provável → verificação → ação de recuperação.

  **Implementação sugerida:**
  - `docs/infrastructure/runbooks/checkout-failure.md`
  - `docs/infrastructure/runbooks/checkin-failure.md`
  - `docs/infrastructure/runbooks/auth-failure.md`

  **Arquivos/áreas afetadas:** `docs/infrastructure/runbooks/`

  **Critérios de aceitação:**
  - [ ] 3 runbooks criados com estrutura consistente.
  - [ ] Sintomas mapeados aos erros de domínio conhecidos.
  - [ ] Ações de recuperação concretas e verificáveis.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 3h
  **Dependências:** HDN-002, HDN-003
  **Status:** ✅ Concluído

---

## ✅ Critérios de Encerramento da Fase

- [x] Gate de regressão automatizado cobrindo todos os fluxos críticos.
- [x] Audit trail funcional para order.created, checkin.validated, event.published.
- [x] Shape de erro padronizado em todos os handlers.
- [x] N+1 eliminado nos principais endpoints.
- [x] Rate limiting ativo nos endpoints de escrita.
- [x] 3 runbooks documentados.
- [x] `npm run test` passando (unit + regression — 360 + 24 testes verdes).
- [x] `npm run lint:architecture` sem violações.
- [x] GOV doc de encerramento criado (`GOV-006-phase-009.md`).
- [x] CHANGELOG atualizado.
