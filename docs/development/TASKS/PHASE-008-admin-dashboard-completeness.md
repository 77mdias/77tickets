# 🚀 Tasks - Fase 008: Admin Dashboard Completeness

**Status:** 🟢 CONCLUÍDA
**Última atualização:** 2026-03-31
**Sprint Atual:** Sprint 008
**Status Geral:** 🟢 100% (13/13 tarefas completas)
**ETA:** Concluída em 1 sprint
**Pré-requisito:** Fase 007 (experiência do comprador completa)

---

## 📊 Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Criação de Eventos | 2 | 2 | 0 | 0 | 0 |
| Gestão de Lotes | 5 | 5 | 0 | 0 | 0 |
| Visão de Pedidos Admin | 3 | 3 | 0 | 0 | 0 |
| UI Admin | 3 | 3 | 0 | 0 | 0 |
| **TOTAL** | **13** | **13** | **0** | **0** | **0** |

### 🎯 Principais Indicadores
- 🟢 Criação de evento concluída com use-case `createEvent` + endpoint `POST /api/events`.
- 🟢 Gestão de lotes concluída com `LotRepository.save()` (upsert) e endpoints de criação/edição.
- 🟢 Visão de vendas concluída com `OrderRepository.listByEventId()` e endpoint de listagem por evento.
- 🟢 Operações de publicação/status e novas operações administrativas consolidadas na UI de gestão.

---

## 🎯 Objetivos da Fase

- Implementar use-case e endpoint de criação de evento pelo organizer/admin.
- Implementar CRUD de lotes com validações de janela de venda e estoque.
- Implementar listagem de pedidos por evento para visão de vendas do organizer.
- Entregar UI de gestão completa: criar evento, criar lotes, ver pedidos.
- Manter enforcement de ownership em todas as operações administrativas.

---

## 📦 Estrutura de Categorias

### 📦 Criação de Eventos — Use-case e endpoint

#### Objetivo
Permitir que organizer e admin criem eventos diretamente pela aplicação com validações corretas.

- [x] **EVT-008** - Use-case `createEvent`

  **Descrição curta:**
  - Implementar use-case de criação de evento com validações de campos obrigatórios.
  - Gerar slug único a partir do título.
  - Vincular `organizerId` ao usuário autenticado (não ao payload do cliente).

  **Implementação sugerida:**
  - `src/server/application/use-cases/create-event.use-case.ts`
  - `src/server/api/schemas/create-event.schema.ts` — title, description, location, startsAt, endsAt, imageUrl
  - Slug gerado server-side (título → kebab-case + sufixo único)
  - Autorização: somente `organizer` e `admin`

  **Arquivos/áreas afetadas:** `src/server/application/use-cases/`, `src/server/api/schemas/`, `src/server/domain/events/`

  **Critérios de aceitação:**
  - [x] Evento criado em status `draft`.
  - [x] Slug único gerado server-side.
  - [x] `organizerId` derivado da sessão.
  - [x] Campos obrigatórios validados via Zod.
  - [x] Testes unitários (RED → GREEN).

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 4h
  **Dependências:** Fase 006 (AUTH-002, SCH-004)
  **Status:** ✅ Concluída

- [x] **EVT-009** - Handler + endpoint `POST /api/events`

  **Descrição curta:**
  - Handler thin para criação de evento pelo organizer/admin.
  - Retornar evento criado com id e slug.

  **Implementação sugerida:**
  - `src/server/api/events/create-event.handler.ts`
  - `src/app/api/events/route.ts` — adicionar POST (GET já existe da Fase 007)
  - Route adapter atualizado

  **Arquivos/áreas afetadas:** `src/server/api/events/`, `src/app/api/events/`

  **Critérios de aceitação:**
  - [x] `401` sem sessão; `403` para role não autorizado.
  - [x] `201` com evento criado em draft.
  - [x] Testes de handler e autorização.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Dependências:** EVT-008
  **Status:** ✅ Concluída

---

### 📦 Gestão de Lotes — CRUD completo

#### Objetivo
Habilitar criação e edição de lotes de ingresso pelo organizer, respeitando regras de janela de venda e estoque.

- [x] **LOT-001** - Adicionar `save()` ao `LotRepository`

  **Descrição curta:**
  - Adicionar método `save(lot: LotRecord)` (upsert) ao contrato e implementação Drizzle.
  - Atualizar `LotRecord` para incluir campos editáveis.

  **Implementação sugerida:**
  - Atualizar `src/server/repositories/lot.repository.contracts.ts`
  - Implementar em `src/server/repositories/drizzle/drizzle-lot.repository.ts`

  **Arquivos/áreas afetadas:** `lot.repository.contracts.ts`, `drizzle-lot.repository.ts`

  **Critérios de aceitação:**
  - [x] Insert e update funcional via `save()`.
  - [x] Testes de integração de repositório.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Dependências:** —
  **Status:** ✅ Concluída

- [x] **LOT-002** - Use-case `createLot`

  **Descrição curta:**
  - Implementar use-case de criação de lote com validações de janela de venda, estoque mínimo e `maxPerOrder`.
  - Validar que o evento pertence ao organizer autenticado.

  **Implementação sugerida:**
  - `src/server/application/use-cases/create-lot.use-case.ts`
  - `src/server/api/schemas/create-lot.schema.ts`
  - Autorização: organizer owner do evento / admin

  **Arquivos/áreas afetadas:** `src/server/application/use-cases/`, `src/server/api/schemas/`, `src/server/domain/lots/`

  **Critérios de aceitação:**
  - [x] Lote criado vinculado ao evento correto.
  - [x] Janela de venda válida (saleStartsAt < saleEndsAt).
  - [x] Estoque > 0, `maxPerOrder` > 0.
  - [x] Organizer não cria lote em evento de outro organizer.
  - [x] Testes unitários (RED → GREEN).

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 4h
  **Dependências:** LOT-001, EVT-009
  **Status:** ✅ Concluída

- [x] **LOT-003** - Handler + endpoint `POST /api/lots`

  **Descrição curta:**
  - Handler thin para criação de lote pelo organizer/admin.

  **Implementação sugerida:**
  - `src/server/api/lots/create-lot.handler.ts`
  - `src/app/api/lots/route.ts`
  - Route adapter

  **Arquivos/áreas afetadas:** `src/server/api/lots/`, `src/app/api/lots/`

  **Critérios de aceitação:**
  - [x] `401/403` para não autorizados.
  - [x] `201` com lote criado.
  - [x] Testes de handler e autorização (cross-organizer bloqueado).

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Dependências:** LOT-002
  **Status:** ✅ Concluída

- [x] **LOT-004** - Use-case `updateLot`

  **Descrição curta:**
  - Permitir ajuste de `title`, `priceInCents`, `totalQuantity`, `saleStartsAt`, `saleEndsAt`, `maxPerOrder`.
  - Validar que redução de estoque não compromete pedidos existentes.

  **Implementação sugerida:**
  - `src/server/application/use-cases/update-lot.use-case.ts`
  - `src/server/api/schemas/update-lot.schema.ts`

  **Arquivos/áreas afetadas:** `src/server/application/use-cases/`, `src/server/api/schemas/`

  **Critérios de aceitação:**
  - [x] Campos parciais atualizados corretamente.
  - [x] Não é possível reduzir estoque abaixo do já vendido.
  - [x] Testes unitários.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 3h
  **Dependências:** LOT-002
  **Status:** ✅ Concluída

- [x] **LOT-005** - Handler + endpoint `PUT /api/lots/:id`

  **Descrição curta:**
  - Handler thin para atualização de lote pelo organizer/admin.

  **Implementação sugerida:**
  - `src/server/api/lots/update-lot.handler.ts`
  - `src/app/api/lots/[id]/route.ts`

  **Arquivos/áreas afetadas:** `src/server/api/lots/`, `src/app/api/lots/[id]/`

  **Critérios de aceitação:**
  - [x] `403` para organizer não-owner.
  - [x] `200` com lote atualizado.
  - [x] Testes de handler e autorização.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Dependências:** LOT-004
  **Status:** ✅ Concluída

---

### 📦 Visão de Pedidos Admin — Listagem de vendas por evento

#### Objetivo
Permitir que organizer visualize os pedidos do seu evento com status e itens, suprindo RF-010 do PRD.

- [x] **ORD-008** - Adicionar `listByEventId()` ao `OrderRepository`

  **Descrição curta:**
  - Adicionar método `listByEventId(eventId)` ao contrato e implementação Drizzle.
  - Incluir `orderItems` no retorno com dados do lote.

  **Implementação sugerida:**
  - Atualizar `src/server/repositories/order.repository.contracts.ts`
  - Implementar em `src/server/repositories/drizzle/drizzle-order.repository.ts`

  **Arquivos/áreas afetadas:** `order.repository.contracts.ts`, `drizzle-order.repository.ts`

  **Critérios de aceitação:**
  - [x] Retorna pedidos com items e informações de lote.
  - [x] Testes de integração.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Dependências:** —
  **Status:** ✅ Concluída

- [x] **ORD-009** - Use-case `listEventOrders`

  **Descrição curta:**
  - Use-case para organizer/admin listar pedidos de um evento.
  - Authorização: organizer owner do evento / admin global.

  **Implementação sugerida:**
  - `src/server/application/use-cases/list-event-orders.use-case.ts`
  - Usar `ownership.policy.ts` existente

  **Arquivos/áreas afetadas:** `src/server/application/use-cases/`

  **Critérios de aceitação:**
  - [x] Organizer não acessa pedidos de evento de outro organizer.
  - [x] Admin acessa qualquer evento.
  - [x] Testes unitários (RED → GREEN).

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Dependências:** ORD-008
  **Status:** ✅ Concluída

- [x] **ORD-010** - Handler + endpoint `GET /api/events/:id/orders`

  **Descrição curta:**
  - Handler thin para listagem de pedidos de um evento pelo organizer/admin.

  **Implementação sugerida:**
  - `src/server/api/orders/list-event-orders.handler.ts`
  - `src/app/api/events/[slug]/orders/route.ts`

  **Arquivos/áreas afetadas:** `src/server/api/orders/`, `src/app/api/events/[slug]/orders/`

  **Critérios de aceitação:**
  - [x] `401/403` para não autorizados.
  - [x] Retorna pedidos com status e itens.
  - [x] Testes de handler e autorização.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Dependências:** ORD-009
  **Status:** ✅ Concluída

---

### 📦 UI Admin — Páginas de gestão

- [x] **UX-008** - Página admin: criar/editar evento

  **Descrição curta:**
  - Formulário completo para criação de evento e gestão de status/publicação.
  - Campos: título, descrição, localização, data de início/fim, imagem.
  - Integrar com `POST /api/events`, `POST /api/events/publish` e `POST /api/events/update-status`.

  **Arquivos/áreas afetadas:** `src/features/admin/`, `src/app/admin/`

  **Critérios de aceitação:**
  - [x] Formulário conectado à API com feedback de sucesso/erro.
  - [x] Validação client-side básica (campos obrigatórios).
  - [x] Sem regra de negócio no componente UI.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 4h
  **Dependências:** EVT-009
  **Status:** ✅ Concluída

- [x] **UX-009** - Página admin: criar/editar lotes de um evento

  **Descrição curta:**
  - Formulário para criação e edição de lotes vinculados ao evento.
  - Integrar com `POST /api/lots` e `PUT /api/lots/:id`.

  **Arquivos/áreas afetadas:** `src/features/admin/`, `src/app/admin/`

  **Critérios de aceitação:**
  - [x] Lista de lotes existentes exibida.
  - [x] Formulário de criação/edição conectado à API.
  - [x] Sem regra de negócio no componente UI.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 4h
  **Dependências:** LOT-003
  **Status:** ✅ Concluída

- [x] **UX-010** - Página admin: visualizar pedidos do evento

  **Descrição curta:**
  - Tabela de pedidos com: data, status, total, items.
  - Integrar com `GET /api/events/:id/orders`.

  **Arquivos/áreas afetadas:** `src/features/admin/`, `src/app/admin/`

  **Critérios de aceitação:**
  - [x] Pedidos listados com status e itens.
  - [x] Filtro por status (pendente/pago/cancelado).
  - [x] Sem regra de negócio no componente UI.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 3h
  **Dependências:** ORD-010
  **Status:** ✅ Concluída

---

## ✅ Critérios de Encerramento da Fase

- [x] Organizer consegue criar evento + lotes + publicar + ver pedidos.
- [x] Admin consegue operar em qualquer evento.
- [x] Ownership enforcement em todas as operações (cross-organizer bloqueado).
- [x] `npm run test` passando (unit + regression + integration).
- [x] `npm run lint:architecture` sem violações.
- [x] GOV doc de encerramento criado.
- [x] CHANGELOG atualizado.
