## Sprint 008 — Admin Dashboard Completeness

### Objetivo

Completar o painel administrativo com criação de eventos, CRUD de lotes e visão de pedidos por evento, entregando o fluxo admin ponta a ponta: criar evento → criar lotes → publicar → acompanhar vendas.

---

## Contexto

* **Problema atual:** sem use-case `createEvent`; `LotRepository` sem operações de escrita; `OrderRepository` sem `listByEventId()`; organizer não consegue criar e gerenciar eventos pela aplicação.
* **Impacto:** demo admin incompleto; RF-008, RF-009 e RF-010 do PRD não atendidos.
* **Riscos envolvidos:** ownership enforcement crítico — organizer não pode operar em eventos de outros.
* **Áreas afetadas:** `src/server/application/use-cases/` (4 novos), `src/server/api/` (5 novos handlers), `src/server/repositories/` (2 contratos expandidos), `src/app/admin/` (3 novos formulários/visões).

---

## Etapa 1 — Discovery Técnico

* Verificar se `EventRepository.save()` já suporta insert ou apenas update — definir comportamento para `createEvent`.
* Confirmar schema de `lots` para o `save()` do `LotRepository`.
* Mapear validações de `createLot`: janela de venda, estoque mínimo, `maxPerOrder`.
* Verificar se há slug collision handling necessário em `createEvent`.

---

## Etapa 2 — Design de Comportamento e Estratégia de Testes

### Casos de teste planejados

* [ ] Cenário 1: organizer cria evento → criado em draft com slug único.
* [ ] Cenário 2: organizer cria lote com janela de venda e estoque válidos.
* [ ] Cenário 3: organizer não cria lote em evento de outro organizer → `403`.
* [ ] Cenário 4: organizer vê pedidos apenas do próprio evento → cross-event bloqueado.
* [ ] Cenário 5: admin cria/gerencia qualquer evento sem restrição de ownership.
* [ ] Cenário 6: redução de estoque do lote não permite quantidade abaixo do vendido.

---

## Etapa 3 — Testes Primeiro (TDD)

* Começar por `createEvent` e `createLot` use-cases (fluxo mais crítico).
* Cobrir todos os cenários de ownership antes de implementar os handlers.

---

## Etapa 4 — Implementação

Sequência recomendada:

1. EVT-008: use-case `createEvent`
2. EVT-009: handler + endpoint `POST /api/events`
3. LOT-001: `LotRepository.save()`
4. LOT-002: use-case `createLot`
5. LOT-003: handler + endpoint `POST /api/lots`
6. LOT-004: use-case `updateLot`
7. LOT-005: handler + endpoint `PUT /api/lots/:id`
8. ORD-008: `OrderRepository.listByEventId()`
9. ORD-009: use-case `listEventOrders`
10. ORD-010: handler + endpoint `GET /api/events/:id/orders`
11. UX-008 a UX-010: páginas admin

---

## Etapa 5 — Validação

* `npm run test` — todos os testes passando.
* `npm run lint:architecture` — sem violações.
* Fluxo manual: criar evento → criar lotes → publicar → simular compra → ver pedido no admin.
* Verificar cross-organizer bloqueado em todos os endpoints novos.

---

## Critérios de Aceite da Sprint

- [ ] Organizer consegue criar evento + lotes + publicar + ver pedidos.
- [ ] Admin global sem restrição de ownership.
- [ ] Cross-organizer bloqueado em todos os endpoints.
- [ ] `npm run test` verde.
