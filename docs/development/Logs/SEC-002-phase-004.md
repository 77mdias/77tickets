# SEC-002 (Fase 004) - Regressão de duplo check-in e ticket inválido

Data: 2026-03-29

## Objetivo
Cobrir regressões operacionais de check-in para evitar quebra silenciosa em:
- concorrência de duplo check-in no mesmo ticket;
- ticket ativo vinculado a pedido expirado.

## Escopo executado
- Suíte dedicada criada em `tests/regression/checkin/checkin.regression.test.ts`.
- Cenários cobertos:
  - duas tentativas concorrentes no mesmo ticket resultam em exatamente uma aprovação e uma rejeição `ticket_used`;
  - ticket com pedido expirado é rejeitado como `order_not_eligible`.
- Sincronização de documentação operacional:
  - `docs/development/TASKS/PHASE-004-ticket-checkin-rbac.md`
  - `docs/development/TASKS.md`
  - `docs/development/CHANGELOG.md`

## Evidência RED
Comando:
```bash
npx vitest run --config vitest.config.ts tests/regression/checkin/checkin.regression.test.ts
```

Resultado:
- Falha reproduzível inicial por ausência do arquivo de teste (`No test files found`).

## Evidência GREEN
Comandos:
```bash
npx vitest run --config vitest.config.ts tests/regression/checkin/checkin.regression.test.ts
npm run test:regression
```

Resultado:
- suíte dedicada de check-in: `1 passed`, `2 passed`;
- regressões completas: `3 passed`, `6 passed`.

## Validações obrigatórias
Comandos:
```bash
npm run lint
npm run build
```

Resultado:
- lint: OK
- build: OK (`/api/checkin` e `/checkin` gerados com sucesso)

## Encerramento da task
- `SEC-002` marcada como concluída na fase 004.
- Critérios de aceite da task marcados como concluídos.
- Progresso da fase atualizado para `8/9`.
