# Changelog

Este arquivo segue o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e versionamento semântico.

## [Unreleased]

### Added

- Criado [`docs/development/README.md`](./README.md) com guia operacional da documentação de desenvolvimento.
- Criado [`docs/development/ROADMAP.md`](./ROADMAP.md) com fases evolutivas alinhadas ao `AGENTS.md`.
- Criado [`docs/development/CHANGELOG.md`](./CHANGELOG.md) para rastreabilidade de mudanças.
- Criadas sprints iniciais em [`docs/development/SPRINTS/`](./SPRINTS) seguindo o `SPRINT-TEMPLATE.md`:
  - `SPRINT-001-foundation-architecture-tdd.md`
  - `SPRINT-002-domain-schema-repositories.md`
  - `SPRINT-003-create-order-flow.md`
  - `SPRINT-004-ticket-checkin-rbac.md`
- Criada `SPRINT-005-organizer-admin-event-operations.md` em [`docs/development/SPRINTS/`](./SPRINTS).
- Criada decomposição operacional completa por fase em [`docs/development/TASKS/`](./TASKS):
  - `PHASE-001-foundation-architecture-tdd.md`
  - `PHASE-002-domain-schema-repositories.md`
  - `PHASE-003-create-order-flow.md`
  - `PHASE-004-ticket-checkin-rbac.md`
  - `PHASE-005-organizer-admin-event-operations.md`
- Criado índice de execução em [`docs/development/TASKS.md`](./TASKS.md).
- Criada convenção de validação de entrada com Zod na camada `src/server/api`:
  - `src/server/api/schemas/create-order.schema.ts`
  - `src/server/api/validation/parse-input.ts`
  - `src/server/api/create-order.handler.ts`
- Adicionados testes TDD iniciais para validação de payload e handler:
  - `src/server/api/validation/parse-input.test.ts`
  - `src/server/api/create-order.handler.test.ts`
- Configurado runner de testes com Vitest para TDD inicial:
  - `vitest.config.ts`
  - scripts `test`, `test:unit`, `test:integration`, `test:watch` no `package.json`
  - suite `tests/unit/**` e `tests/integration/**`
- Criados guardrails arquiteturais com ESLint para bloquear imports indevidos entre `UI`, `api`, `application` e `domain`.
- Criado script `lint:architecture` para validar fronteiras arquiteturais nas camadas protegidas.
- Criado log técnico `docs/development/Logs/TDD-003.md` com evidência local de RED -> GREEN.

### Changed

- Definida convenção explícita para atualização contínua de `TASKS`, roadmap e changelog por fase.
- Atualizada a fase 001 com conclusão da task `ARC-003` e progresso geral de `2/9` para `3/9`.
- Migrados os testes iniciais de `node:test` para Vitest em `tests/unit/server/api/**`.
- Atualizada a fase 001 com conclusão da task `TDD-001` e progresso geral de `3/9` para `4/9`.
- Documentadas em `docs/development/README.md` as fronteiras de importação protegidas pelo lint e os comandos de validação local.

### Notes

- Próximas alterações devem ser registradas primeiro em `[Unreleased]`.
- Ao criar uma release, mova os itens para uma seção versionada com data no formato `YYYY-MM-DD`.
