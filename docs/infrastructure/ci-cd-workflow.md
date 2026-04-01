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
  - valida segredos obrigatórios dentro do job do ambiente (`preview`/`production`)
  - build + migration + deploy + smoke test `/api/events`
  - smoke usa `NEXT_PUBLIC_APP_URL` do environment para validar disponibilidade real do alvo
  - fallback explícito quando `wrangler.toml` não existe

## Segredos Requeridos

### CI
- `TEST_DATABASE_URL` (somente para integração)

### CD (por environment)
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`

## Hardening de Deploy Cloudflare

- O deploy usa `--keep-vars` para não apagar bindings já existentes no Worker.
- Variáveis e secrets de runtime do Worker são gerenciados explicitamente no Cloudflare Dashboard por ambiente.
- `BETTER_AUTH_URL` e `NEXT_PUBLIC_APP_URL` permanecem como variáveis de runtime no Cloudflare Dashboard (plaintext vars).
- O workflow falha explicitamente quando qualquer segredo obrigatório estiver ausente no ambiente GitHub correspondente.
- Use environments do GitHub (`preview` e `production`) para separar credenciais e evitar uso acidental de segredos de produção em preview.

## Gate de Segurança

- O script `scripts/ci/check-bun-audit-high.mjs` converte o output do `bun audit --json` em política de bloqueio.
- `moderate` e `low`: permitidos.
- `high` e `critical`: bloqueiam o workflow.

## Rollback Operacional

1. Interromper deploy corrente.
2. Reexecutar workflow apontando para commit/tag estável anterior.
3. Executar smoke test (`/api/events`) no ambiente restaurado.
4. Registrar incidente e causa raiz.
