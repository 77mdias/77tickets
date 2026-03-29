## Sprint 007 — Public Customer Experience

### Objetivo

Implementar todos os fluxos do comprador: listagem pública de eventos, detalhe de evento com lotes, checkout conectado ao auth real e "Meus Ingressos" com QR code visual — entregando o demo funcional ponta a ponta.

---

## Contexto

* **Problema atual:** zero endpoints GET públicos; read-side dos repositórios incompleto; comprador não consegue navegar, comprar ou ver seus ingressos.
* **Impacto no sistema/produto:** sem esta fase, o demo não é demonstrável para um usuário final real.
* **Riscos envolvidos:** dependência crítica da Fase 006 (auth real); QR visual deve ser leve e compatível com Workers.
* **Áreas afetadas:** `src/server/repositories/` (3 novos métodos), `src/server/application/use-cases/` (4 novos), `src/server/api/` (4 novos handlers), `src/app/` (4 novas páginas/rotas).

---

## Etapa 1 — Discovery Técnico

* Confirmar que `EventRecord` já inclui `description`, `location`, `imageUrl` após SCH-004 da Fase 006.
* Verificar biblioteca de QR code: `qrcode` ou equivalente leve, compatível com RSC/Workers.
* Mapear como o slug será roteado no Vinext (`src/app/eventos/[slug]/`).
* Confirmar comportamento de paginação esperado para listagem de eventos.

---

## Etapa 2 — Design de Comportamento e Estratégia de Testes

### Casos de teste planejados

* [ ] Cenário 1: `GET /api/events` retorna lista de eventos publicados com paginação.
* [ ] Cenário 2: `GET /api/events/:slug` retorna evento com lotes ativos; lotes esgotados com `available: 0`.
* [ ] Cenário 3: `GET /api/events/:slug` retorna `404` para evento não publicado.
* [ ] Cenário 4: `GET /api/orders/mine` sem sessão retorna `401`.
* [ ] Cenário 5: customer vê somente seus próprios pedidos/tickets.
* [ ] Cenário 6: fluxo ponta a ponta — login → evento → selecionar lote → checkout → ticket com QR.

---

## Etapa 3 — Testes Primeiro (TDD)

* Escrever testes RED para cada use-case novo antes da implementação.
* Prioridade: `listPublishedEvents` → `getEventDetail` → `getCustomerOrders` → fluxo ponta a ponta.

---

## Etapa 4 — Implementação

Sequência recomendada:

1. EVT-003: `listPublished()` no repositório
2. EVT-005: use-case `listPublishedEvents`
3. EVT-006: handler + endpoint `GET /api/events`
4. EVT-007: use-case `getEventDetail` + endpoint `GET /api/events/:slug`
5. TKT-001: `listByCustomerId()` no repositório
6. ORD-005: `listByCustomerId()` no repositório
7. ORD-006: use-case `getCustomerOrders`
8. ORD-007: handler + endpoint `GET /api/orders/mine`
9. QR-001: geração de QR code
10. UX-004 a UX-007: páginas UI

---

## Etapa 5 — Validação

* `npm run test` — todos os testes passando.
* `npm run lint:architecture` — sem violações.
* Fluxo manual completo: acessar `/` → clicar evento → selecionar lote → checkout → ver `/meus-ingressos` com QR.

---

## Critérios de Aceite da Sprint

- [ ] `GET /api/events` e `GET /api/events/:slug` funcionais.
- [ ] `GET /api/orders/mine` retorna tickets com token.
- [ ] QR code visível em "Meus Ingressos".
- [ ] Fluxo ponta a ponta funcionando com usuário autenticado.
- [ ] `npm run test` verde.
