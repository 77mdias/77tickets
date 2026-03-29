## Sprint 009 — Hardening

### Objetivo

Elevar a confiabilidade, observabilidade e performance da plataforma para nível de demo avançado: gates de regressão automatizados, audit trail estruturado, N+1 eliminado e documentação operacional de runbooks.

---

## Contexto

* **Problema atual:** riscos documentados no ROADMAP — regressões silenciosas em autorização e baixa visibilidade operacional sem audit trail.
* **Impacto:** plataforma funciona mas não tem maturidade operacional para demonstração avançada ou transição para produção.
* **Riscos envolvidos:** refatoração de queries pode introduzir regressões; rate limiting deve ser compatível com Workers.
* **Áreas afetadas:** `tests/regression/`, `src/server/infrastructure/observability/`, `src/server/repositories/drizzle/` (otimização), `src/server/api/` (shape de erro), middleware de edge (rate limiting).

---

## Etapa 1 — Discovery Técnico

* Revisar queries existentes para identificar N+1 confirmados em `createOrder`, `listEventOrders`, `listPublishedEvents`.
* Confirmar biblioteca de rate limiting compatível com Cloudflare Workers (sem `node:*` APIs).
* Verificar se `checkout-observability.ts` existente pode ser extendido para audit trail ou se convém criar novo módulo.

---

## Etapa 2 — Design de Comportamento e Estratégia de Testes

### Casos de teste planejados

* [ ] Cenário 1: N compras concorrentes no mesmo lote → estoque nunca negativo.
* [ ] Cenário 2: audit trail registra `order.created` com campos corretos.
* [ ] Cenário 3: audit trail registra `checkin.validated` e `event.published`.
* [ ] Cenário 4: rate limit bloqueia excesso de requisições com `429`.
* [ ] Cenário 5: todos os endpoints retornam shape de erro `{ error: { code, message } }` consistente.

---

## Etapa 3 — Implementação

Sequência recomendada (sem bloqueios entre si — pode ser paralelizada):

1. HDN-001: expandir regression gate
2. HDN-009: edge cases de RBAC
3. HDN-002: audit trail
4. HDN-003: padronizar erros
5. HDN-004: revisar N+1
6. HDN-005: payload minimization
7. HDN-006: connection pooling
8. HDN-007: rate limiting
9. HDN-010: stress test de concorrência
10. HDN-008: runbooks

---

## Etapa 4 — Validação

* `npm run test` — unit + regression + integration passando.
* `npm run lint:architecture` — sem violações.
* Stress test de concorrência passando sem estoque negativo.
* Runbooks revisados por alguém além do autor.

---

## Critérios de Aceite da Sprint

- [ ] Gate de regressão cobrindo auth + compra + checkin + autorização.
- [ ] Audit trail para os 3 eventos críticos.
- [ ] Shape de erro padronizado em todos os handlers.
- [ ] N+1 eliminado nos principais endpoints.
- [ ] 3 runbooks criados.
- [ ] `npm run test` verde.
