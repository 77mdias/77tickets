# 🚀 Tasks - Fase 012: Runtime/API Security Hardening

**Status:** ✅ CONCLUÍDA
**Última atualização:** 2026-04-01
**Sprint Atual:** Sprint 012
**Status Geral:** ✅ 100% (4/4 tarefas completas)
**ETA:** 1 sprint
**Pré-requisito:** Fase 011 (CI Foundation + Supply Chain Security)

---

## 📊 Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Contrato de Erro e Middleware | 2 | 2 | 0 | 0 | 0 |
| Proteção de Rotas e Headers | 2 | 2 | 0 | 0 | 0 |
| **TOTAL** | **4** | **4** | **0** | **0** | **0** |

### 🎯 Principais Indicadores
- ✅ Erro de domínio `rate_limited` mapeado para HTTP `429`.
- ✅ Keying de rate-limit por `scope + actor + ip` aplicado.
- ✅ Rotas críticas (`orders`, `checkin`, `auth`) protegidas.
- ✅ Contrato de erro e headers (`X-RateLimit-*`, `Retry-After`) cobertos por testes.

---

## 🎯 Objetivos da Fase

- Endurecer endpoints de escrita contra abuso e brute-force.
- Padronizar o contrato de erro para throttling com shape estável.
- Garantir headers de segurança e de rate-limit no boundary de API.
- Proteger rotas críticas sem regressão de RBAC e contratos existentes.

---

## 📦 Estrutura de Categorias

### 📦 Contrato de Erro e Middleware — Base de throttling

- [x] **S012-SEC-001** - Introduzir `rate_limited` no domínio/API

  **Modo recomendado:** backend  
  **Tipo:** feature

  **Descrição curta:**
  - Criar erro de domínio para excesso de requisições.
  - Garantir mapeamento consistente para `429` na camada API.

  **Implementação sugerida:**
  - Atualizar `app-error` com código `rate_limited`.
  - Atualizar `error-mapper` e shape de resposta padronizado.

  **Arquivos/áreas afetadas:** `src/server/application/errors/*`, `src/server/api/error-mapper.ts`, `tests/unit/server/api/error-mapper.test.ts`, `tests/unit/api/error-shape.test.ts`

  **Critérios de aceitação:**
  - [x] Erro `rate_limited` existe no domínio.
  - [x] `rate_limited` retorna HTTP `429`.
  - [x] Shape `{ error: { code, message, details? } }` preservado.

  **Estratégia de teste:**
  - [x] Unitário
  - [x] Regressão

  **Dependências:** Nenhuma  
  **Bloqueia:** S012-SEC-002  
  **Pode rodar em paralelo com:** S012-SEC-003

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 2h  
  **Responsável:** equipe/core  
  **Status:** ✅ Completo

- [x] **S012-SEC-002** - Criar utilitário de enforcement por request

  **Modo recomendado:** backend  
  **Tipo:** feature

  **Descrição curta:**
  - Implementar key builder e enforcement de rate-limit por requisição.
  - Incorporar metadados de limite para resposta padronizada.

  **Implementação sugerida:**
  - Criar `rate-limit-request.ts`.
  - Integrar com rate limiter em memória Workers-compatible.

  **Arquivos/áreas afetadas:** `src/server/api/middleware/rate-limit-request.ts`, `src/server/api/middleware/rate-limiter.ts`, `tests/unit/server/api/middleware/rate-limit-request.test.ts`, `tests/unit/api/middleware/rate-limiter.test.ts`

  **Critérios de aceitação:**
  - [x] Key inclui `scope + userId + ip`.
  - [x] Bloqueio gera erro `rate_limited` com detalhes de limite.
  - [x] Comportamento determinístico coberto por testes.

  **Estratégia de teste:**
  - [x] Unitário
  - [x] Regressão

  **Dependências:** S012-SEC-001  
  **Bloqueia:** S012-SEC-003, S012-SEC-004  
  **Pode rodar em paralelo com:** Nenhuma

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 2h  
  **Responsável:** equipe/core  
  **Status:** ✅ Completo

---

### 📦 Proteção de Rotas e Headers — Aplicação nas superfícies críticas

- [x] **S012-SEC-003** - Aplicar rate-limit nas rotas críticas

  **Modo recomendado:** backend  
  **Tipo:** feature

  **Descrição curta:**
  - Enforçar rate-limit em `POST /api/orders`, `POST /api/checkin` e `POST /api/auth/*`.
  - Garantir que bloqueio resulte em `429` sem quebrar o fluxo de autorização.

  **Implementação sugerida:**
  - Integrar middleware/utilitário nos route adapters e rota auth.
  - Usar limites pré-configurados por escopo.

  **Arquivos/áreas afetadas:** `src/app/api/orders/route.ts`, `src/app/api/checkin/route.ts`, `src/app/api/auth/[...all]/route.ts`, `src/server/api/orders/create-order.route-adapter.ts`, `src/server/api/checkin/validate-checkin.route-adapter.ts`

  **Critérios de aceitação:**
  - [x] Rotas críticas retornam `429` ao exceder limite.
  - [x] Respostas de sucesso/erro existentes sem regressão funcional.
  - [x] Cobertura de testes de throttling nas rotas críticas.

  **Estratégia de teste:**
  - [x] Unitário
  - [x] Regressão

  **Dependências:** S012-SEC-002  
  **Bloqueia:** S012-SEC-004  
  **Pode rodar em paralelo com:** Nenhuma

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 2h  
  **Responsável:** equipe/core  
  **Status:** ✅ Completo

- [x] **S012-SEC-004** - Padronizar headers de segurança e rate-limit

  **Modo recomendado:** backend  
  **Tipo:** feature

  **Descrição curta:**
  - Garantir headers de segurança em respostas API.
  - Incluir headers de rate-limit em respostas de bloqueio `429`.

  **Implementação sugerida:**
  - Consolidar resposta em utilitário de security response.
  - Emitir `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` quando aplicável.

  **Arquivos/áreas afetadas:** `src/server/api/security-response.ts`, `tests/unit/server/api/create-order.route-adapter.test.ts`, `tests/unit/server/api/checkin/validate-checkin.route-adapter.test.ts`

  **Critérios de aceitação:**
  - [x] Headers de segurança presentes no boundary API.
  - [x] Headers de rate-limit presentes em bloqueio `429`.
  - [x] Contrato documentado e validado por testes.

  **Estratégia de teste:**
  - [x] Unitário
  - [x] Regressão

  **Dependências:** S012-SEC-002, S012-SEC-003  
  **Bloqueia:** Nenhuma  
  **Pode rodar em paralelo com:** Nenhuma

  **Prioridade:** 🟡 Alta  
  **Estimativa:** 2h  
  **Responsável:** equipe/core  
  **Status:** ✅ Completo

---

## 🧪 Testes e Validações

- **Suites necessárias:** unit, regression, build
- **Comandos de verificação:**
  - `npm run test:unit`
  - `npm run test:regression`
  - `npm run build`
- **Estado atual:** ✅ Passando

---

## ✅ Checklist de Encerramento da Fase

- [x] Todas as tarefas críticas concluídas
- [x] Contrato `429` padronizado e coberto por testes
- [x] Rotas críticas protegidas sem regressão
- [x] Documentação atualizada
- [x] Critérios de aceite da sprint atendidos
