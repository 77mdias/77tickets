# TicketFlow Development Docs

Este diretório centraliza a documentação operacional de desenvolvimento do projeto TicketFlow.

## Fonte de Verdade

A referência principal de arquitetura e regras é o arquivo [`AGENTS.md`](../../AGENTS.md).
Quando houver conflito, siga `AGENTS.md`.

## Estrutura

- [`docs/development/README.md`](./README.md): guia de uso da pasta.
- [`docs/development/ROADMAP.md`](./ROADMAP.md): planejamento por fases.
- [`docs/development/CHANGELOG.md`](./CHANGELOG.md): histórico de mudanças.
- [`docs/development/TASKS.md`](./TASKS.md): índice de fases e progresso.
- `docs/development/SPRINTS/`: planejamento de sprints no template oficial.
- `docs/development/TASKS/`: tarefas por fase/sprint.
- [`docs/Templates/TASK-TEMPLATE.md`](../Templates/TASK-TEMPLATE.md): template oficial de tarefas.

## Regras Essenciais de Desenvolvimento

- Manter separação de camadas: `UI -> handler -> use-case -> repository -> database`.
- Não colocar regra de negócio em UI nem em handlers.
- Validar toda entrada externa com Zod.
- Usar TDD para features, bugfixes e mudanças de comportamento.
- Calcular preço, total e validação de estoque apenas no servidor.
- Preservar portabilidade para `Next.js + NestJS` (evitar acoplamento forte ao runtime atual).

## Guardrails Arquiteturais

O lint local e de CI agora bloqueia imports que quebram as fronteiras principais do projeto.

- `src/app`, `src/components` e `src/features` não podem importar `src/server`.
- `src/server/api` não pode importar `src/server/repositories` nem `src/server/infrastructure`.
- `src/server/application` não pode importar `src/server/api` nem `src/server/infrastructure`.
- `src/server/domain` não pode importar `api`, `application`, `repositories` nem `infrastructure`.

Essas regras existem para preservar o fluxo `UI -> handler -> use-case -> repository -> database` e reduzir retrabalho na migração futura para `Next.js + NestJS`.

### Como validar

- `npm run lint:architecture`: executa o ESLint nas áreas com guardrails de fronteira.
- `npm run lint`: executa o lint completo do repositório.
- `npm run build`: valida que a aplicação continua compilando após a mudança.

## Fluxo Recomendado (Resumo)

1. Definir objetivo de negócio da entrega.
2. Atualizar domínio/contratos/schemas.
3. Escrever teste falhando (Red).
4. Implementar mínimo para passar (Green).
5. Refatorar com testes verdes.
6. Atualizar documentação (`TASKS`, `ROADMAP`, `CHANGELOG`) antes de concluir.

## Como Atualizar Esta Pasta

1. Crie/atualize arquivo de fase em `docs/development/TASKS/` usando o template.
2. Atualize `ROADMAP.md` quando fase mudar de status ou escopo.
3. Registre no `CHANGELOG.md` as mudanças em `[Unreleased]`.
4. Ao fechar release, promova itens de `[Unreleased]` para uma versão datada.

## Convenções de Status

- `Planned`: ainda não iniciado.
- `In Progress`: em desenvolvimento ativo.
- `Blocked`: possui dependência impedindo avanço.
- `Done`: concluído e validado.

## Critério de Conclusão (DoD) de Documentação

- Roadmap atualizado para refletir o estado real.
- Changelog atualizado com impacto técnico e de produto.
- Tarefas da fase atual consistentes com o que foi entregue.
- Nenhuma decisão arquitetural recente sem registro.
