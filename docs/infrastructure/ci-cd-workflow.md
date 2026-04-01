# CI/CD Workflow — TicketFlow

Date: 2026-04-01

## Objetivo

Padronizar execução de qualidade, segurança e deploy para reduzir regressões e risco operacional.

## Workflows

- `ci.yml`
  - roda em `pull_request` e `push` na `main`
  - `quality`: lint, lint arquitetural, unit, regression, build
  - `integration`: roda somente quando `TEST_DATABASE_URL` está configurado
- `security.yml`
  - roda em `pull_request`, `push` na `main` e cron semanal
  - CodeQL (SAST)
  - Secret scan (Gitleaks)
  - Audit de dependências com bloqueio para severidade `high/critical`
- `cd-workers.yml`
  - preview: PR e `workflow_dispatch` target `preview`
  - production: `push` na `main` e `workflow_dispatch` target `production`
  - build + migration + deploy + smoke test `/api/events`
  - fallback explícito quando `wrangler.toml` não existe

## Segredos Requeridos

### CI
- `TEST_DATABASE_URL` (somente para integração)

### CD (por environment)
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `DATABASE_URL`

## Gate de Segurança

- O script `scripts/ci/check-bun-audit-high.mjs` converte o output do `bun audit --json` em política de bloqueio.
- `moderate` e `low`: permitidos.
- `high` e `critical`: bloqueiam o workflow.

## Rollback Operacional

1. Interromper deploy corrente.
2. Reexecutar workflow apontando para commit/tag estável anterior.
3. Executar smoke test (`/api/events`) no ambiente restaurado.
4. Registrar incidente e causa raiz.
