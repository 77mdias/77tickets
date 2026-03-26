# 🚀 Tasks - Fase 002: Core Domain + Schema + Repositories

**Status:** 🔴 BLOQUEADA
**Última atualização:** 2026-03-26
**Sprint Atual:** Sprint 002
**Status Geral:** ⚪ 0% (0/10 tarefas completas) - FASE PLANEJADA
**ETA:** 1 sprint (6 a 8 dias úteis)
**Pré-requisito:** Fase 001 (pendente)

---

> **📌 NOTA (opcional):** fase dependente da conclusão da base de TDD, Drizzle e estrutura de camadas da fase 001.

---

## 📊 Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Domínio de Negócio | 4 | 0 | 0 | 0 | 4 |
| Schema e Repositórios | 4 | 0 | 0 | 0 | 4 |
| Segurança e Qualidade | 2 | 0 | 0 | 0 | 2 |
| **TOTAL** | **10** | **0** | **0** | **0** | **10** |

### 🎯 Principais Indicadores (opcional)
- ✅ Regras de negócio centrais já mapeadas no AGENTS.md.
- ⚠️ Sem entidades de domínio implementadas.
- ⚠️ Fase depende diretamente de setup de testes e banco da fase 001.

---

## 🎯 Objetivos da Fase

- Modelar entidades e invariantes centrais de ticketing.
- Definir status e transições válidas para pedidos e eventos.
- Implementar schemas de banco alinhados ao domínio com Drizzle.
- Criar contratos e implementações iniciais de repositórios.
- Cobrir regras críticas com testes unitários e integração.
- Garantir que domínio/aplicação permaneçam framework-agnostic.
- Preparar base robusta para o fluxo de compra da fase 003.

---

## 📦 Estrutura de Categorias

### 📦 Domínio de Negócio - Entidades, invariantes e regras centrais

#### Objetivo
Consolidar o coração do produto em objetos e regras explícitas para evitar lógica dispersa por handlers/UI. Esta categoria define comportamento esperado de eventos, lotes, pedidos, tickets e cupons.

#### DOM.1 - Modelagem de entidades e regras

- [x] **DOM-001** - Definir entidades e value objects principais

  **Descrição curta:**
  - Estruturar tipos de domínio para `Event`, `Lot`, `Order`, `Ticket`, `Coupon`.
  - Centralizar propriedades e contratos essenciais.

  **Implementação sugerida:**
  - Criar arquivos por agregado em `src/server/domain/*`.
  - Definir tipos explícitos e enums de status.
  - Separar criação/validação de objeto por módulo.

  **Arquivos/áreas afetadas:** `src/server/domain/events/*`, `src/server/domain/orders/*`, `src/server/domain/tickets/*`, `src/server/domain/coupons/*`

  **Critérios de aceitação:**
  - [x] Entidades cobrem conceitos principais sem dependência de framework.
  - [x] Nomes seguem convenções explícitas definidas no AGENTS.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 4h
  **Dependências:** Fase 001
  **Status:** ✅ Concluído

- [ ] **DOM-002** - Implementar regras de lotes e janelas de venda

  **Descrição curta:**
  - Garantir que lote respeite janela de venda e limite de quantidade.
  - Bloquear oversell e inconsistências temporais.

  **Implementação sugerida:**
  - Criar funções de validação de disponibilidade.
  - Criar regra de limite por pedido.
  - Cobrir edge cases de janela inválida.

  **Arquivos/áreas afetadas:** `src/server/domain/lots/*`, `tests/unit/domain/lots/*.test.ts`

  **Critérios de aceitação:**
  - [ ] Lote fora de janela retorna indisponível.
  - [ ] Limite por pedido é enforce no domínio.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 3h  
  **Dependências:** DOM-001  
  **Status:** ⛔ Bloqueado

- [ ] **DOM-003** - Implementar regras de status de pedido e validade de ticket

  **Descrição curta:**
  - Definir transições permitidas de pedido.
  - Definir validade de ticket em função do estado do pedido.

  **Implementação sugerida:**
  - Criar policy de transição de status.
  - Implementar regra de invalidação para pedido expirado/não pago.
  - Adicionar testes de regressão para transições inválidas.

  **Arquivos/áreas afetadas:** `src/server/domain/orders/*`, `src/server/domain/tickets/*`, `tests/unit/domain/orders/*.test.ts`

  **Critérios de aceitação:**
  - [ ] Transições inválidas são rejeitadas.
  - [ ] Ticket de pedido expirado não pode ser considerado ativo.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 4h  
  **Dependências:** DOM-001  
  **Status:** ⛔ Bloqueado

- [ ] **DOM-004** - Implementar regras de cupom (janela, limite e aplicabilidade)

  **Descrição curta:**
  - Garantir elegibilidade de cupom com regras centralizadas.
  - Evitar aplicação indevida de desconto.

  **Implementação sugerida:**
  - Criar policy de elegibilidade de cupom.
  - Adicionar validação de janela e uso máximo.
  - Cobrir cenários de cupom inválido/expirado.

  **Arquivos/áreas afetadas:** `src/server/domain/coupons/*`, `tests/unit/domain/coupons/*.test.ts`

  **Critérios de aceitação:**
  - [ ] Cupom inválido não altera total.
  - [ ] Cupom válido respeita limites configurados.

  **Prioridade:** 🟡 Alta  
  **Estimativa:** 3h  
  **Dependências:** DOM-001  
  **Status:** ⛔ Bloqueado

### 📦 Schema e Repositórios - Persistência orientada ao domínio

#### Objetivo
Traduzir domínio para schema explícito em Postgres/Drizzle e criar repositórios com contrato de negócio, ocultando detalhes de query do restante da aplicação.

#### DBR.1 - Modelagem de dados e camada de persistência

- [ ] **DBR-001** - Criar schema Drizzle para agregados centrais

  **Descrição curta:**
  - Modelar tabelas e relacionamentos de eventos/lotes/pedidos/tickets/cupons.
  - Garantir alinhamento com regras de domínio.

  **Implementação sugerida:**
  - Criar tabelas com constraints essenciais.
  - Definir índices para consultas críticas.
  - Gerar migration versionada.

  **Arquivos/áreas afetadas:** `src/server/infrastructure/db/schema/*`, `drizzle/*`

  **Critérios de aceitação:**
  - [ ] Migration aplica sem erro em ambiente de teste.
  - [ ] Constraints cobrem integridade mínima.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 5h  
  **Dependências:** DOM-001  
  **Status:** ⛔ Bloqueado

- [ ] **DBR-002** - Definir contratos de repositório por agregado

  **Descrição curta:**
  - Separar interfaces de persistência por contexto de negócio.
  - Suportar use-cases sem acesso direto ao ORM.

  **Implementação sugerida:**
  - Criar `event.repository.contracts.ts`, `order.repository.contracts.ts`, etc.
  - Definir métodos por intenção de negócio.
  - Revisar nomenclatura explícita e consistente.

  **Arquivos/áreas afetadas:** `src/server/repositories/*.contracts.ts`

  **Critérios de aceitação:**
  - [ ] Contratos sem leak de SQL/Drizzle.
  - [ ] Métodos cobrindo necessidades da fase 003.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 3h  
  **Dependências:** DOM-001  
  **Status:** ⛔ Bloqueado

- [ ] **DBR-003** - Implementar repositórios Drizzle iniciais

  **Descrição curta:**
  - Criar implementações concretas para contratos definidos.
  - Validar serialização e mapeamento entre banco e domínio.

  **Implementação sugerida:**
  - Implementar `drizzle-event.repository.ts`, `drizzle-order.repository.ts`, etc.
  - Criar mappers de entidade persistida <-> domínio.
  - Cobrir erros esperados de persistência.

  **Arquivos/áreas afetadas:** `src/server/repositories/drizzle/*`, `src/server/infrastructure/db/*`

  **Critérios de aceitação:**
  - [ ] Implementações respeitam interfaces e responsabilidades.
  - [ ] Sem regra de negócio dentro do repositório.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 5h  
  **Dependências:** DBR-001, DBR-002  
  **Status:** ⛔ Bloqueado

- [ ] **DBR-004** - Criar testes de integração de persistência

  **Descrição curta:**
  - Validar operações CRUD críticas dos agregados.
  - Garantir queries consistentes com schema e contratos.

  **Implementação sugerida:**
  - Criar fixtures de teste por agregado.
  - Testar persistência, leitura e updates críticos.
  - Testar casos de conflito/constraint.

  **Arquivos/áreas afetadas:** `tests/integration/repositories/*.test.ts`, `tests/fixtures/*`

  **Critérios de aceitação:**
  - [ ] Testes iniciam RED e passam após implementação.
  - [ ] Erros de constraint mapeados adequadamente.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 4h  
  **Dependências:** DBR-003  
  **Status:** ⛔ Bloqueado

### 📦 Segurança e Qualidade - RBAC base e regressão inicial

#### Objetivo
Introduzir verificação básica de ownership e papéis no backend e estabelecer cobertura de regressão para riscos críticos já mapeados no domínio.

#### SEC.1 - Segurança mínima para próxima fase

- [ ] **SEC-001** - Implementar política inicial de ownership e papéis

  **Descrição curta:**
  - Definir checks para `organizer` operar somente próprios eventos.
  - Definir bypass permitido para `admin`.

  **Implementação sugerida:**
  - Criar módulo de policy de autorização.
  - Incluir helper reutilizável em handlers/use-cases.
  - Adicionar testes unitários da policy.

  **Arquivos/áreas afetadas:** `src/server/application/security/*`, `tests/unit/application/security/*.test.ts`

  **Critérios de aceitação:**
  - [ ] `organizer` sem ownership recebe erro de autorização.
  - [ ] `admin` tem acesso global conforme regra.

  **Prioridade:** 🟡 Alta  
  **Estimativa:** 3h  
  **Dependências:** DOM-001, DBR-002  
  **Status:** ⛔ Bloqueado

- [ ] **SEC-002** - Cobrir regressões iniciais de estoque/estado

  **Descrição curta:**
  - Evitar regressões antes da implementação do fluxo de compra.
  - Formalizar cenários de risco como testes automatizados.

  **Implementação sugerida:**
  - Criar teste para oversell em limite de lote.
  - Criar teste para ticket inválido por pedido expirado.
  - Adicionar esses testes ao gate de CI.

  **Arquivos/áreas afetadas:** `tests/regression/*.test.ts`, `package.json`

  **Critérios de aceitação:**
  - [ ] Regressões críticas cobertas e executando em pipeline.
  - [ ] Falhas reproduzíveis antes do fix.

  **Prioridade:** 🟡 Alta  
  **Estimativa:** 2h30  
  **Dependências:** DOM-002, DOM-003, TDD base (fase 001)  
  **Status:** ⛔ Bloqueado

---

## 🧪 Testes e Validações

- **Suites necessárias:** Unit (domínio/policy), Integration (repositórios/DB), Regression.
- **Cobertura alvo:** >85% do domínio e >75% de repositórios críticos.
- **Comandos de verificação:** `npm run test:unit`, `npm run test:integration`, `npm run test`.
- **Estado atual:** ⚠️ Em falha (dependente de fase 001).

---

## 📚 Documentação e Comunicação

- Atualizar `docs/development/TASKS.md` ao destravar fase.
- Atualizar `docs/development/CHANGELOG.md` após cada bloco concluído.
- Registrar decisões de schema em documentação de banco.
- Comunicar mudanças de contrato para quem implementará fase 003.

---

## ✅ Checklist de Encerramento da Fase

- [ ] Entidades e regras de domínio implementadas e testadas.
- [ ] Schema e migrations aplicados com sucesso.
- [ ] Repositórios funcionando com testes de integração.
- [ ] Regras básicas de RBAC e ownership em vigor.
- [ ] Documentação atualizada e fase pronta para `createOrder`.
