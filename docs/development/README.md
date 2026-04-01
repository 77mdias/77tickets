# TicketFlow Development Docs

Este diretório centraliza a documentação operacional de desenvolvimento do projeto TicketFlow.

## Fonte de Verdade

A autoridade de regras agora é em camadas:

1. instrução direta do usuário
2. [`AGENTS.md`](../../AGENTS.md) (global)
3. `AGENTS.md` locais por diretório (ex.: `src/server`, `src/app`, `tests`)
4. skills em `.agents-os/SKILLS` (workflow helper)
5. superpowers/process helpers

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

### Comandos essenciais

| Comando | O que faz |
|---------|-----------|
| `npm run test` | Roda toda a suite (unit + integration) |
| `npm run test:unit` | Roda apenas testes unitários |
| `npm run test:integration` | Roda testes de integração (requer `TEST_DATABASE_URL`) |
| `npm run test:watch` | Modo watch para TDD local |
| `npm run lint` | Lint completo do repositório |
| `npm run lint:architecture` | Valida fronteiras arquiteturais |
| `npm run build` | Valida que a aplicação compila |
| `npm run ci:quality` | Gate de qualidade usado no workflow de CI |
| `npm run ci:integration` | Executa testes de integração para CI |
| `npm run security:audit` | Bloqueia advisories de dependências `high/critical` |

> Para testes de integração, configure `TEST_DATABASE_URL` no `.env` apontando para um banco/branch Neon separado do desenvolvimento. Consulte `docs/development/Logs/INF-002.md` para detalhes do setup.

## CI/CD e Segurança

- Workflows versionados em `.github/workflows/`:
  - `ci.yml`: quality gate (lint, architecture lint, unit/regression, build) + integração condicional por segredo.
  - `security.yml`: CodeQL, secret scan e dependency audit com bloqueio em severidade alta/crítica.
  - `cd-workers.yml`: deploy preview/production para Cloudflare Workers com smoke test e fallback quando `wrangler.toml` não existe.
- Segredos esperados no GitHub:
  - `TEST_DATABASE_URL` (integração em CI)
  - `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DATABASE_URL` por ambiente (CD)

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
