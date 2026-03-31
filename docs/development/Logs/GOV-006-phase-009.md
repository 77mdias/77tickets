# GOV-006 (Fase 009) — Encerramento de Governança

## Objetivo

Registrar o fechamento técnico/operacional da Fase 009 (Hardening), com evidências de validação e sincronização documental.

## Entregas consolidadas

### Testing & Regressão

- **HDN-001** — Regression gate expandido:
  - `tests/regression/auth/auth.regression.test.ts` — sessão expirada (null resolve) e token inválido → 401
  - `tests/regression/orders/order-state.regression.test.ts` — lot sale window expirado, lot não iniciado, cupom inválido
  - `tests/regression/checkin/checkin.regression.test.ts` — ticket de outro evento (`event_mismatch`)
  - 6 arquivos de regressão, 24 testes passando

- **HDN-009** — Edge cases de RBAC em testes de integração:
  - `tests/integration/api/lots/auth.test.ts` — 10 testes cobrindo create/update-lot com customer, checker, cross-organizer, organizer próprio, admin
  - `tests/integration/api/orders/list-event-orders.auth.test.ts` — 5 testes cobrindo customer, checker, organizer cross-ownership, organizer próprio, admin
  - Todos os endpoints com ≥2 cenários negativos de autorização

- **HDN-010** — Stress test de concorrência no decremento de estoque:
  - `tests/unit/use-cases/create-order-concurrency.test.ts` — 2 testes simulando N pedidos concorrentes; exatamente N-1 aprovados, 1 `conflict/insufficient_stock`

### Observabilidade

- **HDN-002** — Audit trail para operações críticas:
  - `src/server/infrastructure/observability/audit-trail.ts` — factory `createAuditTrail` com `logOrderCreated`, `logCheckinValidated`, `logEventPublished`
  - Injetado (opcional) em `validate-checkin.use-case.ts` e `publish-event.use-case.ts`
  - `create-order.use-case.ts` já possuía observabilidade (`checkout-observability`)
  - Formato JSON estruturado: `[audit-trail][event-name] {...}`

- **HDN-003** — Shape de erro padronizado:
  - Auditados 13 handlers — todos usam `mapAppErrorToResponse` ✅
  - `tests/unit/api/error-shape.test.ts` — 15 testes snapshot cobrindo todos os 6 códigos de erro, erros desconhecidos → 500, ausência de vazamento de stack/DB

### Performance

- **HDN-004** — N+1 eliminado em `createOrder`:
  - `LotRepository.findByIds` adicionado ao contrato e implementado com `inArray` no Drizzle
  - `create-order.use-case.ts` faz batch lookup de todos os lotes em 1 query ao invés de N `findById` individuais
  - `tests/unit/api/payload-minimization.test.ts` — 12 testes verificando ausência de `description`, `organizerId` e outros campos em endpoints de listagem

- **HDN-005** — Payload minimization verificada:
  - `list-published-events`: strips `description`, `organizerId`, `status`, `endsAt` ✅
  - `get-customer-orders`: sem campos admin-only ✅
  - `list-event-orders`: campos admin-scope corretos para contexto ✅
  - `get-event-detail`: `description` mantido intencionalmente (página de detalhe) ✅

- **HDN-006** — Connection pooling documentado:
  - `src/server/infrastructure/db/client.ts` — JSDoc explicando por que `Pool` (WebSocket) e não HTTP mode
  - Scan completo: zero usos de `node:*` APIs no caminho crítico ✅

### Segurança & Docs

- **HDN-007** — Rate limiting básico:
  - `src/server/api/middleware/rate-limiter.ts` — `createRateLimiter` + store in-memory Workers-compatible
  - Pre-configurado: `createOrderRateLimiter` (10 req/min), `authLoginRateLimiter` (5 req/min), `checkinRateLimiter` (60 req/min)
  - `tests/unit/api/middleware/rate-limiter.test.ts` — 5 testes (allow, block, reset, retryAfter, independent keys)
  - Nota de produção: KV store necessário para escala multi-instância

- **HDN-008** — Runbooks operacionais:
  - `docs/infrastructure/runbooks/checkout-failure.md` — 5 sintomas (lot_not_found, out_of_window, insufficient_stock, invalid_coupon, erro interno)
  - `docs/infrastructure/runbooks/checkin-failure.md` — 6 sintomas (ticket_not_found, event_mismatch, ticket_used, ticket_cancelled, order_not_eligible, 403 RBAC)
  - `docs/infrastructure/runbooks/auth-failure.md` — 5 sintomas (401 global, 401 intermitente, 403 checkout, 403 checkin, role default indevido)

## Correção crítica incluída

**Bug corrigido (HDN-010):** `create-order.use-case.ts` nunca chamava `decrementAvailableQuantity`, deixando o estoque jamais decrementado após compra. Corrigido com:
- Chamada de `decrementAvailableQuantity` após criação do pedido
- Guard atômico no SQL: `WHERE available_quantity >= quantity` → retorna `false` se race condition ocorreu
- Teste de concorrência verificando que estoque não fica negativo

## Evidências de validação

```bash
npm run test:unit     # 360 testes — verde
npm run test:regression  # 24 testes — verde
npm run lint:architecture  # zero violações
```

## Atualizações de governança/documentação

- `docs/development/TASKS/PHASE-009-hardening.md` atualizado para `10/10`.
- `docs/development/CHANGELOG.md` atualizado com entregas da Fase 009.

## Status final

Fase 009 encerrada. Plataforma com maturidade operacional para demo avançado:
- Gates de regressão cobrindo auth + compra + checkin + autorização
- Audit trail estruturado para os 3 fluxos críticos
- Shape de erro 100% padronizado em todos os handlers
- N+1 eliminado + stock decrement corrigido
- 3 runbooks operacionais documentados
