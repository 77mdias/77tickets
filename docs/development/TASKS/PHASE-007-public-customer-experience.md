# 🚀 Tasks - Fase 007: Public Customer Experience

**Status:** 🟢 CONCLUÍDA
**Última atualização:** 2026-03-30
**Sprint Atual:** Sprint 007
**Status Geral:** 🟢 100% (13/13 tarefas completas)
**ETA:** 1–2 sprints
**Pré-requisito:** Fase 006 (auth real integrada)

---

## 📊 Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Read-Side Backend | 7 | 7 | 0 | 0 | 0 |
| UI e Fluxo do Comprador | 4 | 4 | 0 | 0 | 0 |
| QR e Ticket Visual | 1 | 1 | 0 | 0 | 0 |
| Conectar Checkout | 1 | 1 | 0 | 0 | 0 |
| **TOTAL** | **13** | **13** | **0** | **0** | **0** |

### 🎯 Principais Indicadores
- 🟢 Endpoints GET públicos entregues e testados (`/api/events`, `/api/events/:slug`, `/api/orders/mine`).
- 🟢 Read-side concluído com `listPublished()` e `listByCustomerId()` em pedidos/tickets.
- 🟢 Fluxo ponta a ponta do comprador disponível: login → evento → checkout → meus ingressos com QR.

---

## 🎯 Objetivos da Fase

- Expor endpoint público de listagem de eventos e detalhe por slug.
- Implementar "Meus Ingressos" com QR/token visual para o comprador.
- Completar read-side dos repositórios de evento, ticket e pedido.
- Conectar `checkout-form` ao auth real e ao use-case `createOrder`.
- Entregar fluxo completo: acessar evento → selecionar lote → checkout → ver ticket com QR.

---

## 📦 Estrutura de Categorias

### 📦 Read-Side Backend — Contratos, use-cases e endpoints de leitura

#### Objetivo
Completar o read-side da camada de repositórios e expor os endpoints GET necessários para as UIs públicas e autenticadas do comprador.

#### EVT.R - Eventos públicos

- [x] **EVT-003** - Adicionar `listPublished()` ao `EventRepository`

  **Descrição curta:**
  - Adicionar método `listPublished(options?: { limit, offset })` ao contrato e à implementação Drizzle.
  - Retornar somente eventos com status `published` e `startsAt` no futuro ou em andamento.

  **Implementação sugerida:**
  - Atualizar `src/server/repositories/event.repository.contracts.ts`
  - Implementar em `src/server/repositories/drizzle/drizzle-event.repository.ts`
  - Teste de integração para paginação e filtro de status

  **Arquivos/áreas afetadas:** `event.repository.contracts.ts`, `drizzle-event.repository.ts`

  **Critérios de aceitação:**
  - [x] Retorna somente eventos publicados.
  - [x] Suporte a paginação básica (limit/offset).
  - [x] Testes de integração cobrindo listagem vazia e com resultados.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Dependências:** Fase 006 (SCH-004)
  **Status:** ✅ Concluída

- [x] **EVT-005** - Use-case `listPublishedEvents`

  **Descrição curta:**
  - Implementar use-case de listagem pública de eventos sem autenticação.
  - Retornar shape mínimo para listagem (id, slug, title, startsAt, imageUrl, location).

  **Implementação sugerida:**
  - `src/server/application/use-cases/list-published-events.use-case.ts`
  - Nenhuma autorização necessária (público).

  **Arquivos/áreas afetadas:** `src/server/application/use-cases/`

  **Critérios de aceitação:**
  - [x] Use-case retorna eventos publicados paginados.
  - [x] Testes unitários com mock de repositório.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h30
  **Dependências:** EVT-003
  **Status:** ✅ Concluída

- [x] **EVT-006** - Handler + endpoint `GET /api/events`

  **Descrição curta:**
  - Handler thin para listagem pública de eventos.
  - Sem autenticação obrigatória. Suporte a `?page=` e `?limit=`.

  **Implementação sugerida:**
  - `src/server/api/events/list-events.handler.ts`
  - `src/app/api/events/route.ts` (GET handler)

  **Arquivos/áreas afetadas:** `src/server/api/events/`, `src/app/api/events/`

  **Critérios de aceitação:**
  - [x] `GET /api/events` retorna lista de eventos publicados.
  - [x] Paginação funcional.
  - [x] Testes de handler e integração.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Dependências:** EVT-005
  **Status:** ✅ Concluída

- [x] **EVT-007** - Handler + endpoint `GET /api/events/:slug`

  **Descrição curta:**
  - Endpoint de detalhe de evento por slug, incluindo lotes ativos.
  - Público. Retornar erro `404` para evento não publicado.

  **Implementação sugerida:**
  - `src/server/application/use-cases/get-event-detail.use-case.ts` — carrega evento + lotes ativos
  - `src/server/api/events/get-event.handler.ts`
  - `src/app/api/events/[slug]/route.ts`

  **Arquivos/áreas afetadas:** `src/server/application/use-cases/`, `src/server/api/events/`, `src/app/api/events/[slug]/`

  **Critérios de aceitação:**
  - [x] Retorna evento + lotes ativos no período de venda.
  - [x] Lotes fora do período ou esgotados retornam com `available: 0`.
  - [x] 404 para slug inexistente ou evento não publicado.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Dependências:** EVT-005
  **Status:** ✅ Concluída

#### TKT.R / ORD.R - Tickets e pedidos do comprador

- [x] **TKT-001** - Adicionar `listByCustomerId()` ao `TicketRepository`

  **Descrição curta:**
  - Adicionar método `listByCustomerId(customerId)` ao contrato e implementação Drizzle.
  - Retornar tickets com campos: id, token, status, eventId, orderId, checkedInAt.

  **Implementação sugerida:**
  - Atualizar `src/server/repositories/ticket.repository.contracts.ts`
  - Implementar em `src/server/repositories/drizzle/drizzle-ticket.repository.ts`

  **Arquivos/áreas afetadas:** `ticket.repository.contracts.ts`, `drizzle-ticket.repository.ts`

  **Critérios de aceitação:**
  - [x] Retorna apenas tickets do customer especificado.
  - [x] Testes de integração.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Dependências:** Fase 006 (SCH-001)
  **Status:** ✅ Concluída

- [x] **ORD-005** - Adicionar `listByCustomerId()` ao `OrderRepository`

  **Descrição curta:**
  - Adicionar método `listByCustomerId(customerId)` ao contrato e implementação Drizzle.
  - Incluir `orderItems` no retorno.

  **Implementação sugerida:**
  - Atualizar `src/server/repositories/order.repository.contracts.ts`
  - Implementar em `src/server/repositories/drizzle/drizzle-order.repository.ts`

  **Arquivos/áreas afetadas:** `order.repository.contracts.ts`, `drizzle-order.repository.ts`

  **Critérios de aceitação:**
  - [x] Retorna pedidos do customer com items.
  - [x] Testes de integração.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Dependências:** Fase 006 (SCH-002)
  **Status:** ✅ Concluída

- [x] **ORD-006** - Use-case `getCustomerOrders`

  **Descrição curta:**
  - Use-case autenticado: retornar pedidos do cliente com items e tickets associados.

  **Implementação sugerida:**
  - `src/server/application/use-cases/get-customer-orders.use-case.ts`
  - Autorização: apenas o próprio customer acessa (ownership policy).

  **Arquivos/áreas afetadas:** `src/server/application/use-cases/`

  **Critérios de aceitação:**
  - [x] Retorna pedidos com items e tokens de ticket.
  - [x] Customer não acessa pedidos de outros customers.
  - [x] Testes unitários com mock de repositórios.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Dependências:** ORD-005, TKT-001
  **Status:** ✅ Concluída

- [x] **ORD-007** - Handler + endpoint `GET /api/orders/mine`

  **Descrição curta:**
  - Endpoint autenticado para listar pedidos do customer logado com tickets e tokens.

  **Implementação sugerida:**
  - `src/server/api/orders/get-customer-orders.handler.ts`
  - `src/app/api/orders/mine/route.ts`

  **Arquivos/áreas afetadas:** `src/server/api/orders/`, `src/app/api/orders/mine/`

  **Critérios de aceitação:**
  - [x] 401 sem sessão válida.
  - [x] Retorna pedidos com tokens de ticket.
  - [x] Testes de handler e integração.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Dependências:** ORD-006
  **Status:** ✅ Concluída

---

### 📦 QR e Ticket Visual — Geração e exibição de QR

- [x] **QR-001** - Implementar geração de QR code visual para ticket

  **Descrição curta:**
  - Criar adapter de infraestrutura para gerar QR code a partir do token do ticket.
  - QR deve ser gerado no frontend via biblioteca leve (ex: `qrcode`, `qr-code-styling`).

  **Implementação sugerida:**
  - `src/server/infrastructure/qr/qr-generator.ts` — ou adapter no frontend
  - Token do ticket já existe — apenas transformar em QR visual
  - Avaliar geração client-side para evitar carga no servidor

  **Arquivos/áreas afetadas:** `src/features/` ou `src/server/infrastructure/qr/`

  **Critérios de aceitação:**
  - [x] Token de ticket renderizado como QR code na página "Meus Ingressos".
  - [x] QR legível por leitor padrão.
  - [x] Sem dependências pesadas no bundle.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Dependências:** ORD-007
  **Status:** ✅ Concluída

---

### 📦 UI e Fluxo do Comprador — Páginas públicas e autenticadas

- [x] **UX-004** - Página pública: listagem de eventos (`/`)

  **Descrição curta:**
  - Atualizar `src/app/page.tsx` para listar eventos publicados via `GET /api/events`.
  - Cards de evento com título, data, localização e imagem.

  **Implementação sugerida:**
  - Server component consumindo `GET /api/events`
  - Card de evento com link para detalhe

  **Arquivos/áreas afetadas:** `src/app/page.tsx`, `src/features/events/`

  **Critérios de aceitação:**
  - [x] Lista eventos publicados em tempo real.
  - [x] Estado vazio exibido corretamente.
  - [x] Link para página de detalhe funcionando.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Dependências:** EVT-006
  **Status:** ✅ Concluída

- [x] **UX-005** - Página de detalhe de evento com seleção de lotes (`/eventos/[slug]`)

  **Descrição curta:**
  - Criar `src/app/eventos/[slug]/page.tsx` consumindo `GET /api/events/:slug`.
  - Exibir título, descrição, localização, data e lotes disponíveis com preço e estoque.

  **Implementação sugerida:**
  - Server component com dados do evento + lotes
  - Seletor de lote/quantidade (client component)
  - Botão "Comprar" redireciona para checkout

  **Arquivos/áreas afetadas:** `src/app/eventos/[slug]/page.tsx`, `src/features/checkout/`

  **Critérios de aceitação:**
  - [x] Evento exibido com todos os campos de apresentação.
  - [x] Lotes com estoque > 0 e dentro do período mostrados.
  - [x] Seleção de quantidade dentro do `maxPerOrder`.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 4h
  **Dependências:** EVT-007
  **Status:** ✅ Concluída

- [x] **UX-006** - Página autenticada: "Meus Ingressos" com QR (`/meus-ingressos`)

  **Descrição curta:**
  - Criar `src/app/meus-ingressos/page.tsx` consumindo `GET /api/orders/mine`.
  - Exibir lista de pedidos com status, evento e tickets com QR code.

  **Implementação sugerida:**
  - Server component autenticado (redirecionar para login se sem sessão)
  - Ticket card com token e QR visual via `QR-001`

  **Arquivos/áreas afetadas:** `src/app/meus-ingressos/page.tsx`, `src/features/tickets/`

  **Critérios de aceitação:**
  - [x] Redirecionamento para login se não autenticado.
  - [x] Lista de tickets com QR code renderizado.
  - [x] Status do ticket exibido (válido/usado/cancelado).

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 4h
  **Dependências:** ORD-007, QR-001
  **Status:** ✅ Concluída

---

### 📦 Conectar Checkout — Integração end-to-end

- [x] **UX-007** - Conectar `checkout-form` ao auth real + `createOrder`

  **Descrição curta:**
  - Atualizar `src/features/checkout/checkout-form.tsx` para usar sessão real.
  - Garantir que `customerId` vem da sessão, não de input do formulário.
  - Testar fluxo completo: login → selecionar lote → checkout → pedido criado → ticket gerado.

  **Implementação sugerida:**
  - Remover campos de identidade do form de checkout
  - Usar `getSession()` do AUTH-002 na action/handler de checkout
  - Redirecionar para "Meus Ingressos" após sucesso

  **Arquivos/áreas afetadas:** `src/features/checkout/checkout-form.tsx`, `src/app/api/orders/route.ts`

  **Critérios de aceitação:**
  - [x] `customerId` nunca vem do body do formulário.
  - [x] Fluxo ponta a ponta funcionando para usuário logado.
  - [x] Redirecionamento para "Meus Ingressos" após compra.
  - [x] Teste de integração end-to-end cobrindo o fluxo completo.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Dependências:** Fase 006 (AUTH-002), ORD-007
  **Status:** ✅ Concluída

---

## ✅ Critérios de Encerramento da Fase

- [x] `GET /api/events` e `GET /api/events/:slug` funcionais e testados.
- [x] `GET /api/orders/mine` funcional para customer autenticado.
- [x] Página de listagem, detalhe e "Meus Ingressos" funcionando.
- [x] QR code visível em "Meus Ingressos".
- [x] Fluxo ponta a ponta: acessar evento → checkout → ver ticket com QR.
- [x] `npm run test` passando (unit + regression + integration).
- [x] `npm run lint:architecture` sem violações.
- [x] GOV doc de encerramento criado.
- [x] CHANGELOG atualizado.
