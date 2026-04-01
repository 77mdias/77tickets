# TicketFlow Tasks Index

> Última atualização: 2026-04-01
> Fonte: `docs/development/SPRINTS/*` e `docs/development/TASKS/*`

## Visão Geral de Fases

| Fase | Sprint | Arquivo de Tasks | Status | Progresso |
| ---- | ------ | ---------------- | ------ | --------- |
| 001 | Sprint 001 | `docs/development/TASKS/PHASE-001-foundation-architecture-tdd.md` | 🟢 Concluída | 9/9 |
| 002 | Sprint 002 | `docs/development/TASKS/PHASE-002-domain-schema-repositories.md` | 🟢 Concluída | 10/10 |
| 003 | Sprint 003 | `docs/development/TASKS/PHASE-003-create-order-flow.md` | 🟢 Concluída | 11/11 |
| 004 | Sprint 004 | `docs/development/TASKS/PHASE-004-ticket-checkin-rbac.md` | 🟢 Concluída | 9/9 |
| 005 | Sprint 005 | `docs/development/TASKS/PHASE-005-organizer-admin-event-operations.md` | 🟢 Concluída | 10/10 |
| 006 | Sprint 006 | `docs/development/TASKS/PHASE-006-auth-schema-completion.md` | 🟢 Concluída | 10/10 |
| 007 | Sprint 007 | `docs/development/TASKS/PHASE-007-public-customer-experience.md` | 🟢 Concluída | 13/13 |
| 008 | Sprint 008 | `docs/development/TASKS/PHASE-008-admin-dashboard-completeness.md` | 🟢 Concluída | 13/13 |
| 009 | Sprint 009 | `docs/development/TASKS/PHASE-009-hardening.md` | 🟢 Concluída | 10/10 |
| 010 | Sprint 010 | `docs/development/TASKS/PHASE-010-migration-readiness.md` | 🟢 Concluída | 8/8 |
| 011 | Sprint 011 | `docs/development/SPRINTS/SPRINT-011-ci-foundation-supply-chain-security.md` | 🟢 Concluída | 4/4 |
| 012 | Sprint 012 | `docs/development/SPRINTS/SPRINT-012-runtime-api-security-hardening.md` | 🟢 Concluída | 4/4 |
| 013 | Sprint 013 | `docs/development/SPRINTS/SPRINT-013-cd-cloudflare-release-security.md` | 🟡 Em andamento | 3/4 |

## Ordem Recomendada de Execução (TDD-first)

### Concluídas
1. Fase 001: base arquitetural, setup de testes e guardrails. ✅
2. Fase 002: domínio, schema e repositórios. ✅
3. Fase 003: fluxo `createOrder` ponta a ponta. ✅
4. Fase 004: validação de ticket + check-in + RBAC operacional. ✅
5. Fase 005: operações organizer/admin + publicação de eventos. ✅
6. Fase 006: auth real + tabela users + campos de apresentação em events. ✅
7. Fase 007: listagem pública, detalhe de evento, meus ingressos, QR code. ✅
8. Fase 008: criar evento, criar lotes, ver pedidos — admin completo. ✅
9. Fase 009: hardening — regressões, audit trail, N+1, rate limiting. ✅
10. Fase 010: migration readiness — auditoria de acoplamentos + MIGRATION-PLAN.md. ✅
11. Fase 011: CI Foundation + Supply Chain Security. ✅
12. Fase 012: Runtime/API Security Hardening. ✅
13. Fase 013: CD Cloudflare + Release Security. 🟡

## Regras Operacionais

- Sempre executar ciclo `Red -> Green -> Refactor` por tarefa.
- Não iniciar fase seguinte sem checklist da fase atual.
- Atualizar progresso no arquivo da fase e neste índice.
- Registrar entregas no `CHANGELOG` em `[Unreleased]`.
