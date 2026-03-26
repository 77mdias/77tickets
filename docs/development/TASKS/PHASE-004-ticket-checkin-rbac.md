# 🚀 Tasks - Fase 004: Ticket Validation + Check-in + RBAC

**Status:** 🔴 BLOQUEADA
**Última atualização:** 2026-03-26
**Sprint Atual:** Sprint 004
**Status Geral:** ⚪ 0% (0/9 tarefas completas) - FASE PLANEJADA
**ETA:** 1 sprint (6 a 8 dias úteis)
**Pré-requisito:** Fase 003 (pendente)

---

## 📊 Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Validação de Ticket | 3 | 0 | 0 | 0 | 3 |
| API de Check-in e Operação | 3 | 0 | 0 | 0 | 3 |
| RBAC, Concorrência e QA | 3 | 0 | 0 | 0 | 3 |
| **TOTAL** | **9** | **0** | **0** | **0** | **9** |

### 🎯 Principais Indicadores (opcional)
- ✅ Regras de check-in e validade já definidas no AGENTS.
- ⚠️ Fase depende de tickets válidos gerados na fase 003.
- ⚠️ Necessidade de forte cobertura de concorrência para evitar duplo uso.

---

## 🎯 Objetivos da Fase

- Implementar `validateCheckin` com regra de uso único do ticket.
- Garantir validação de contexto (ticket pertence ao evento correto).
- Bloquear check-in de ticket usado, cancelado ou expirado.
- Implementar endpoint de check-in com erro estruturado.
- Aplicar RBAC por papel (`checker`, `organizer`, `admin`, `customer`).
- Proteger operação contra corrida de concorrência.
- Disponibilizar interface operacional mínima para check-in.

---

## 📦 Estrutura de Categorias

### 📦 Validação de Ticket - Regras de domínio e use-case

#### Objetivo
Centralizar a validação de ingresso em um caso de uso robusto, mantendo regras de anti-reuso e contexto de evento no backend, como fonte única de verdade.

#### CHK.1 - Regras e comportamento do check-in

- [ ] **CHK-001** - Definir contrato e schemas de validação de check-in

  **Descrição curta:**
  - Definir payload de validação (ticketId/eventId/checker).
  - Padronizar resposta de sucesso e falha.

  **Implementação sugerida:**
  - Criar `validate-checkin.schema.ts`.
  - Definir tipos de output com metadados de validação.
  - Integrar parse de input na camada de handler.

  **Arquivos/áreas afetadas:** `src/server/api/schemas/validate-checkin.schema.ts`, `src/server/application/checkin/checkin.types.ts`

  **Critérios de aceitação:**
  - [ ] Input inválido falha com erro de validação.
  - [ ] Contrato contém informações mínimas para auditoria.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 2h  
  **Dependências:** Fase 003  
  **Status:** ⛔ Bloqueado

- [ ] **CHK-002** - Escrever testes RED de validação de ticket

  **Descrição curta:**
  - Cobrir comportamento esperado antes de implementar.
  - Validar casos positivo/negativo críticos.

  **Implementação sugerida:**
  - Testar ticket válido no evento correto.
  - Testar ticket usado/cancelado/expirado.
  - Testar ticket válido em evento incorreto.

  **Arquivos/áreas afetadas:** `tests/unit/application/validate-checkin.use-case.test.ts`

  **Critérios de aceitação:**
  - [ ] Cenários críticos iniciam RED.
  - [ ] Regras do AGENTS estão representadas em testes.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 3h  
  **Dependências:** CHK-001  
  **Status:** ⛔ Bloqueado

- [ ] **CHK-003** - Implementar `validateCheckin` até GREEN

  **Descrição curta:**
  - Implementar lógica de validação e consumo único do ticket.
  - Garantir consistência de estado após uso.

  **Implementação sugerida:**
  - Carregar ticket e contexto do evento.
  - Validar elegibilidade de check-in.
  - Marcar ticket como usado com metadados.

  **Arquivos/áreas afetadas:** `src/server/application/validate-checkin.use-case.ts`, `src/server/domain/tickets/*`

  **Critérios de aceitação:**
  - [ ] Ticket usado não pode ser reutilizado.
  - [ ] Testes unitários de check-in passam.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 5h  
  **Dependências:** CHK-002  
  **Status:** ⛔ Bloqueado

### 📦 API de Check-in e Operação - Handler e fluxo operacional

#### Objetivo
Expor o caso de uso de check-in via API e interface operacional simples para equipes de evento, mantendo handlers enxutos e validação no backend.

#### OPS.1 - Endpoint e interface operacional

- [ ] **OPS-001** - Implementar handler de check-in com mapeamento de erros

  **Descrição curta:**
  - Criar endpoint para validação em tempo de operação.
  - Garantir respostas previsíveis para app de check-in.

  **Implementação sugerida:**
  - Integrar schema Zod + use-case.
  - Mapear `not-found`, `conflict`, `authorization`.
  - Incluir retorno com razão de falha.

  **Arquivos/áreas afetadas:** `src/server/api/checkin/validate-checkin.handler.ts`, `src/server/api/error-mapper.ts`

  **Critérios de aceitação:**
  - [ ] Handler sem regra de negócio.
  - [ ] Erros estruturados conforme padrão do projeto.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 3h  
  **Dependências:** CHK-003  
  **Status:** ⛔ Bloqueado

- [ ] **OPS-002** - Criar integração de persistência atômica no check-in

  **Descrição curta:**
  - Garantir update seguro do ticket no banco.
  - Evitar inconsistência em tentativas simultâneas.

  **Implementação sugerida:**
  - Implementar update condicional por status.
  - Retornar conflito em segunda tentativa.
  - Cobrir corrida simples com teste de integração.

  **Arquivos/áreas afetadas:** `src/server/repositories/drizzle/ticket.repository.ts`, `tests/integration/repositories/checkin/*.test.ts`

  **Critérios de aceitação:**
  - [ ] Apenas uma tentativa concorrente obtém sucesso.
  - [ ] Estado final do ticket consistente.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 4h  
  **Dependências:** CHK-003  
  **Status:** ⛔ Bloqueado

- [ ] **OPS-003** - Implementar tela operacional mínima de check-in

  **Descrição curta:**
  - Criar interface básica para leitura/validação de ticket.
  - Limitar UI a captura e exibição de resultado.

  **Implementação sugerida:**
  - Criar formulário de validação por ticket.
  - Integrar endpoint de check-in.
  - Exibir status e motivo de rejeição.

  **Arquivos/áreas afetadas:** `src/features/checkin/*`, `app/checkin/*`

  **Critérios de aceitação:**
  - [ ] Fluxo operacional funciona para checker autorizado.
  - [ ] UI não decide validade do ticket localmente.

  **Prioridade:** 🟡 Alta  
  **Estimativa:** 4h  
  **Dependências:** OPS-001  
  **Status:** ⛔ Bloqueado

### 📦 RBAC, Concorrência e QA - Segurança operacional

#### Objetivo
Assegurar que somente papéis autorizados executem check-in e que eventos concorrentes não quebrem a integridade do sistema durante operação real.

#### SEC.1 - Segurança e validação final

- [ ] **SEC-001** - Cobrir RBAC completo de check-in por papel/escopo

  **Descrição curta:**
  - Validar permissões para `checker`, `organizer`, `admin`, `customer`.
  - Garantir escopo por evento e ownership.

  **Implementação sugerida:**
  - Criar testes unitários de policy.
  - Criar testes de integração de autorização no endpoint.
  - Ajustar mensagens/erros para auditoria.

  **Arquivos/áreas afetadas:** `src/server/application/security/*`, `tests/integration/api/checkin/auth*.test.ts`

  **Critérios de aceitação:**
  - [ ] Role sem permissão é bloqueada.
  - [ ] Admin mantém acesso global conforme regra.

  **Prioridade:** 🔴 Crítica  
  **Estimativa:** 3h  
  **Dependências:** OPS-001  
  **Status:** ⛔ Bloqueado

- [ ] **SEC-002** - Criar regressão de duplo check-in e ticket inválido

  **Descrição curta:**
  - Registrar e proteger contra regressões frequentes.
  - Manter testes no pipeline principal.

  **Implementação sugerida:**
  - Criar teste concorrente de check-in duplo.
  - Criar teste de ticket de pedido expirado.
  - Adicionar ao gate padrão.

  **Arquivos/áreas afetadas:** `tests/regression/checkin/*.test.ts`

  **Critérios de aceitação:**
  - [ ] Regressões cobertas e automatizadas.
  - [ ] Falha reproduzível em caso de quebra futura.

  **Prioridade:** 🟡 Alta  
  **Estimativa:** 2h30  
  **Dependências:** CHK-003, OPS-002  
  **Status:** ⛔ Bloqueado

- [ ] **SEC-003** - Encerramento de fase com QA e documentação

  **Descrição curta:**
  - Executar validação de fluxo real e atualizar documentação.
  - Preparar transição para operações de organizer/admin.

  **Implementação sugerida:**
  - Rodar checklist manual em ambiente de homologação.
  - Atualizar changelog e roadmap.
  - Registrar lições aprendidas de operação.

  **Arquivos/áreas afetadas:** `docs/development/TASKS.md`, `docs/development/CHANGELOG.md`, `docs/development/ROADMAP.md`

  **Critérios de aceitação:**
  - [ ] Evidências anexadas e fase validada.
  - [ ] Backlog da fase 005 refinado com base no aprendizado.

  **Prioridade:** 🟢 Média  
  **Estimativa:** 1h30  
  **Dependências:** CHK-001..CHK-003, OPS-001..OPS-003, SEC-001..SEC-002  
  **Status:** ⛔ Bloqueado

---

## 🧪 Testes e Validações

- **Suites necessárias:** Unit (use-case/policy), Integration (API/repository), Regression (concorrência), smoke manual de operação.
- **Cobertura alvo:** >85% de check-in/security.
- **Comandos de verificação:** `npm run test:unit`, `npm run test:integration`, `npm run test`, `npm run lint`.
- **Estado atual:** ⚠️ Em falha (fase bloqueada).

---

## 📚 Documentação e Comunicação

- Atualizar `docs/development/TASKS.md` ao mover fase para ativa.
- Atualizar `docs/development/CHANGELOG.md` com cada entrega concluída.
- Registrar runbook operacional de check-in em docs de operação.
- Compartilhar riscos de concorrência com time de produto/operação.

---

## ✅ Checklist de Encerramento da Fase

- [ ] Validação de ticket implementada e testada.
- [ ] Fluxo de check-in operacional disponível.
- [ ] RBAC completo validado por testes.
- [ ] Regressões de duplo uso cobertas.
- [ ] Documentação atualizada e aprovada.
