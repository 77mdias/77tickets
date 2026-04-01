# Runbook: First Deploy on Cloudflare Workers

Date: 2026-04-01

## Objetivo

Executar o primeiro deploy do TicketFlow no Cloudflare Workers com configuração segura de segredos e baixa chance de falha operacional.

## Pré-requisitos

- Repositório conectado ao GitHub com workflow de CD ativo (`.github/workflows/cd-workers.yml`).
- Projeto Cloudflare Workers criado (script `77tickets` e `77tickets-preview`).
- Banco Neon provisionado.

## Segredos obrigatórios (GitHub Environments)

Configure os mesmos nomes abaixo em **Settings -> Environments** para `preview` e `production`:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`

Notas:
- `BETTER_AUTH_URL` e `NEXT_PUBLIC_APP_URL` devem apontar para a URL pública do ambiente correspondente.
- `DATABASE_URL` de preview deve ser separado do production (branch/database dedicado no Neon).

## Passo a passo no Cloudflare Dashboard

1. Abra `Workers & Pages` e selecione o Worker alvo (`77tickets-preview` ou `77tickets`).
2. Entre em `Settings -> Variables and Secrets`.
3. Clique em `Add` e cadastre:
   - `DATABASE_URL` como **Secret**.
   - `BETTER_AUTH_SECRET` como **Secret**.
   - `BETTER_AUTH_URL` como **Text**.
   - `NEXT_PUBLIC_APP_URL` como **Text**.
4. Salve e faça o deploy.

Importante:
- O workflow reaplica segredos críticos via Wrangler (`DATABASE_URL`, `BETTER_AUTH_SECRET`), mas o dashboard ainda é fonte operacional útil para inspeção e recuperação manual.
- `BETTER_AUTH_URL` e `NEXT_PUBLIC_APP_URL` devem continuar como variáveis plaintext no Worker.

## Checklist de validação pós-deploy

1. Verifique execução verde do `CD (Cloudflare Workers)` no GitHub Actions.
2. Abra a URL de deploy e valide resposta de `GET /api/events?limit=1`.
3. Faça teste de autenticação (sign-in) para validar `BETTER_AUTH_*`.
4. Confira logs do Worker para ausência de erro de configuração de env.

## Falhas comuns e correções

### Erro: `DATABASE_URL environment variable is required`

Causa: segredo ausente ou vazio no ambiente do deploy.

Correção:
1. Confirmar `DATABASE_URL` no GitHub Environment correto (`preview` ou `production`).
2. Confirmar variável no Cloudflare Worker em `Settings -> Variables and Secrets`.
3. Reexecutar workflow.

### Erro de sessão/auth após deploy

Causa provável: `BETTER_AUTH_URL` ou `NEXT_PUBLIC_APP_URL` divergente da URL pública.

Correção:
1. Ajustar ambas para a URL real do ambiente.
2. Reexecutar deploy.
3. Validar login novamente.
