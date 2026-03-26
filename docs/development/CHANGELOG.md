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

### Changed

- Definida convenção explícita para atualização contínua de `TASKS`, roadmap e changelog por fase.

### Notes

- Próximas alterações devem ser registradas primeiro em `[Unreleased]`.
- Ao criar uma release, mova os itens para uma seção versionada com data no formato `YYYY-MM-DD`.
