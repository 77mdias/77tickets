# TicketFlow Tasks Index

> Última atualização: 2026-03-27
> Fonte: `docs/development/SPRINTS/*` e `docs/development/TASKS/*`

## Visão Geral de Fases

| Fase | Sprint | Arquivo de Tasks | Status | Progresso |
| ---- | ------ | ---------------- | ------ | --------- |
| 001 | Sprint 001 | `docs/development/TASKS/PHASE-001-foundation-architecture-tdd.md` | 🟢 Concluída | 9/9 |
| 002 | Sprint 002 | `docs/development/TASKS/PHASE-002-domain-schema-repositories.md` | 🟢 Concluída | 10/10 |
| 003 | Sprint 003 | `docs/development/TASKS/PHASE-003-create-order-flow.md` | 🟡 Em andamento | 1/11 |
| 004 | Sprint 004 | `docs/development/TASKS/PHASE-004-ticket-checkin-rbac.md` | 🔴 Bloqueada | 0/9 |
| 005 | Sprint 005 | `docs/development/TASKS/PHASE-005-organizer-admin-event-operations.md` | 🔴 Bloqueada | 0/10 |

## Ordem Recomendada de Execução (TDD-first)

1. Fase 001: base arquitetural, setup de testes e guardrails.
2. Fase 002: domínio, schema e repositórios.
3. Fase 003: fluxo `createOrder` ponta a ponta.
4. Fase 004: validação de ticket + check-in + RBAC operacional.
5. Fase 005: operações organizer/admin + publicação de eventos.

## Regras Operacionais

- Sempre executar ciclo `Red -> Green -> Refactor` por tarefa.
- Não iniciar fase seguinte sem checklist da fase atual.
- Atualizar progresso no arquivo da fase e neste índice.
- Registrar entregas no `CHANGELOG` em `[Unreleased]`.
