# 🚀 Tasks - Fase 008: Admin Dashboard Completeness

**Status:** 🔵 PLANEJADA
**Última atualização:** 2026-03-29
**Sprint Atual:** Sprint 008
**Status Geral:** 🔵 0% (0/13 tarefas completas)
**ETA:** 1–2 sprints
**Pré-requisito:** Fase 007 (experiência do comprador completa)

---

## 📊 Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Criação de Eventos | 2 | 0 | 0 | 2 | 0 |
| Gestão de Lotes | 5 | 0 | 0 | 5 | 0 |
| Visão de Pedidos Admin | 3 | 0 | 0 | 3 | 0 |
| UI Admin | 3 | 0 | 0 | 3 | 0 |
| **TOTAL** | **13** | **0** | **0** | **13** | **0** |

### 🎯 Principais Indicadores
- 🔴 Criação de evento: use-case `createEvent` inexistente — admin não consegue criar eventos via aplicação.
- 🔴 Gestão de lotes: `LotRepository` sem `save()` — bloqueio total para criar/editar lotes.
- 🔴 Visão de vendas: `OrderRepository` sem `listByEventId()` — organizer não vê pedidos do seu evento.
- ⚠️ Operações de `publishEvent` e `updateEventStatus` já funcionam (Fase 005) — esta fase completa as operações faltantes.

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

- [ ] **EVT-008** - Use-case `createEvent`

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
  - [ ] Evento criado em status `draft`.
  - [ ] Slug único gerado server-side.
  - [ ] `organizerId` derivado da sessão.
  - [ ] Campos obrigatórios validados via Zod.
  - [ ] Testes unitários (RED → GREEN).

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 4h
  **Dependências:** Fase 006 (AUTH-002, SCH-004)
  **Status:** ⏳ Pendente

- [ ] **EVT-009** - Handler + endpoint `POST /api/events`

  **Descrição curta:**
  - Handler thin para criação de evento pelo organizer/admin.
  - Retornar evento criado com id e slug.

  **Implementação sugerida:**
  - `src/server/api/events/create-event.handler.ts`
  - `src/app/api/events/route.ts` — adicionar POST (GET já existe da Fase 007)
  - Route adapter atualizado

  **Arquivos/áreas afetadas:** `src/server/api/events/`, `src/app/api/events/`

  **Critérios de aceitação:**
  - [ ] `401` sem sessão; `403` para role não autorizado.
  - [ ] `201` com evento criado em draft.
  - [ ] Testes de handler e autorização.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Dependências:** EVT-008
  **Status:** ⏳ Pendente

---

### 📦 Gestão de Lotes — CRUD completo

#### Objetivo
Habilitar criação e edição de lotes de ingresso pelo organizer, respeitando regras de janela de venda e estoque.

- [ ] **LOT-001** - Adicionar `save()` ao `LotRepository`

  **Descrição curta:**
  - Adicionar método `save(lot: LotRecord)` (upsert) ao contrato e implementação Drizzle.
  - Atualizar `LotRecord` para incluir campos editáveis.

  **Implementação sugerida:**
  - Atualizar `src/server/repositories/lot.repository.contracts.ts`
  - Implementar em `src/server/repositories/drizzle/drizzle-lot.repository.ts`

  **Arquivos/áreas afetadas:** `lot.repository.contracts.ts`, `drizzle-lot.repository.ts`

  **Critérios de aceitação:**
  - [ ] Insert e update funcional via `save()`.
  - [ ] Testes de integração de repositório.

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Dependências:** —
  **Status:** ⏳ Pendente

- [ ] **LOT-002** - Use-case `createLot`

  **Descrição curta:**
  - Implementar use-case de criação de lote com validações de janela de venda, estoque mínimo e `maxPerOrder`.
  - Validar que o evento pertence ao organizer autenticado.

  **Implementação sugerida:**
  - `src/server/application/use-cases/create-lot.use-case.ts`
  - `src/server/api/schemas/create-lot.schema.ts`
  - Autorização: organizer owner do evento / admin

  **Arquivos/áreas afetadas:** `src/server/application/use-cases/`, `src/server/api/schemas/`, `src/server/domain/lots/`

  **Critérios de aceitação:**
  - [ ] Lote criado vinculado ao evento correto.
  - [ ] Janela de venda válida (saleStartsAt < saleEndsAt).
  - [ ] Estoque > 0, `maxPerOrder` > 0.
  - [ ] Organizer não cria lote em evento de outro organizer.
  - [ ] Testes unitários (RED → GREEN).

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 4h
  **Dependências:** LOT-001, EVT-009
  **Status:** ⏳ Pendente

- [ ] **LOT-003** - Handler + endpoint `POST /api/lots`

  **Descrição curta:**
  - Handler thin para criação de lote pelo organizer/admin.

  **Implementação sugerida:**
  - `src/server/api/lots/create-lot.handler.ts`
  - `src/app/api/lots/route.ts`
  - Route adapter

  **Arquivos/áreas afetadas:** `src/server/api/lots/`, `src/app/api/lots/`

  **Critérios de aceitação:**
  - [ ] `401/403` para não autorizados.
  - [ ] `201` com lote criado.
  - [ ] Testes de handler e autorização (cross-organizer bloqueado).

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Dependências:** LOT-002
  **Status:** ⏳ Pendente

- [ ] **LOT-004** - Use-case `updateLot`

  **Descrição curta:**
  - Permitir ajuste de `title`, `priceInCents`, `totalQuantity`, `saleStartsAt`, `saleEndsAt`, `maxPerOrder`.
  - Validar que redução de estoque não compromete pedidos existentes.

  **Implementação sugerida:**
  - `src/server/application/use-cases/update-lot.use-case.ts`
  - `src/server/api/schemas/update-lot.schema.ts`

  **Arquivos/áreas afetadas:** `src/server/application/use-cases/`, `src/server/api/schemas/`

  **Critérios de aceitação:**
  - [ ] Campos parciais atualizados corretamente.
  - [ ] Não é possível reduzir estoque abaixo do já vendido.
  - [ ] Testes unitários.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 3h
  **Dependências:** LOT-002
  **Status:** ⏳ Pendente

- [ ] **LOT-005** - Handler + endpoint `PUT /api/lots/:id`

  **Descrição curta:**
  - Handler thin para atualização de lote pelo organizer/admin.

  **Implementação sugerida:**
  - `src/server/api/lots/update-lot.handler.ts`
  - `src/app/api/lots/[id]/route.ts`

  **Arquivos/áreas afetadas:** `src/server/api/lots/`, `src/app/api/lots/[id]/`

  **Critérios de aceitação:**
  - [ ] `403` para organizer não-owner.
  - [ ] `200` com lote atualizado.
  - [ ] Testes de handler e autorização.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Dependências:** LOT-004
  **Status:** ⏳ Pendente

---

### 📦 Visão de Pedidos Admin — Listagem de vendas por evento

#### Objetivo
Permitir que organizer visualize os pedidos do seu evento com status e itens, suprindo RF-010 do PRD.

- [ ] **ORD-008** - Adicionar `listByEventId()` ao `OrderRepository`

  **Descrição curta:**
  - Adicionar método `listByEventId(eventId)` ao contrato e implementação Drizzle.
  - Incluir `orderItems` no retorno com dados do lote.

  **Implementação sugerida:**
  - Atualizar `src/server/repositories/order.repository.contracts.ts`
  - Implementar em `src/server/repositories/drizzle/drizzle-order.repository.ts`

  **Arquivos/áreas afetadas:** `order.repository.contracts.ts`, `drizzle-order.repository.ts`

  **Critérios de aceitação:**
  - [ ] Retorna pedidos com items e informações de lote.
  - [ ] Testes de integração.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Dependências:** —
  **Status:** ⏳ Pendente

- [ ] **ORD-009** - Use-case `listEventOrders`

  **Descrição curta:**
  - Use-case para organizer/admin listar pedidos de um evento.
  - Authorização: organizer owner do evento / admin global.

  **Implementação sugerida:**
  - `src/server/application/use-cases/list-event-orders.use-case.ts`
  - Usar `ownership.policy.ts` existente

  **Arquivos/áreas afetadas:** `src/server/application/use-cases/`

  **Critérios de aceitação:**
  - [ ] Organizer não acessa pedidos de evento de outro organizer.
  - [ ] Admin acessa qualquer evento.
  - [ ] Testes unitários (RED → GREEN).

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Dependências:** ORD-008
  **Status:** ⏳ Pendente

- [ ] **ORD-010** - Handler + endpoint `GET /api/events/:id/orders`

  **Descrição curta:**
  - Handler thin para listagem de pedidos de um evento pelo organizer/admin.

  **Implementação sugerida:**
  - `src/server/api/orders/list-event-orders.handler.ts`
  - `src/app/api/events/[id]/orders/route.ts`

  **Arquivos/áreas afetadas:** `src/server/api/orders/`, `src/app/api/events/[id]/orders/`

  **Critérios de aceitação:**
  - [ ] `401/403` para não autorizados.
  - [ ] Retorna pedidos com status e itens.
  - [ ] Testes de handler e autorização.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Dependências:** ORD-009
  **Status:** ⏳ Pendente

---

### 📦 UI Admin — Páginas de gestão

- [ ] **UX-008** - Página admin: criar/editar evento

  **Descrição curta:**
  - Formulário completo para criação e edição de evento.
  - Campos: título, descrição, localização, data de início/fim, imagem.
  - Integrar com `POST /api/events` e `PUT /api/events/:id`.

  **Arquivos/áreas afetadas:** `src/features/admin/`, `src/app/admin/`

  **Critérios de aceitação:**
  - [ ] Formulário conectado à API com feedback de sucesso/erro.
  - [ ] Validação client-side básica (campos obrigatórios).
  - [ ] Sem regra de negócio no componente UI.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 4h
  **Dependências:** EVT-009
  **Status:** ⏳ Pendente

- [ ] **UX-009** - Página admin: criar/editar lotes de um evento

  **Descrição curta:**
  - Formulário para criação e edição de lotes vinculados ao evento.
  - Integrar com `POST /api/lots` e `PUT /api/lots/:id`.

  **Arquivos/áreas afetadas:** `src/features/admin/`, `src/app/admin/`

  **Critérios de aceitação:**
  - [ ] Lista de lotes existentes exibida.
  - [ ] Formulário de criação/edição conectado à API.
  - [ ] Sem regra de negócio no componente UI.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 4h
  **Dependências:** LOT-003
  **Status:** ⏳ Pendente

- [ ] **UX-010** - Página admin: visualizar pedidos do evento

  **Descrição curta:**
  - Tabela de pedidos com: data, status, total, items.
  - Integrar com `GET /api/events/:id/orders`.

  **Arquivos/áreas afetadas:** `src/features/admin/`, `src/app/admin/`

  **Critérios de aceitação:**
  - [ ] Pedidos listados com status e itens.
  - [ ] Filtro por status (pendente/pago/cancelado).
  - [ ] Sem regra de negócio no componente UI.

  **Prioridade:** 🟡 Alta
  **Estimativa:** 3h
  **Dependências:** ORD-010
  **Status:** ⏳ Pendente

---

## ✅ Critérios de Encerramento da Fase

- [ ] Organizer consegue criar evento + lotes + publicar + ver pedidos.
- [ ] Admin consegue operar em qualquer evento.
- [ ] Ownership enforcement em todas as operações (cross-organizer bloqueado).
- [ ] `npm run test` passando (unit + regression + integration).
- [ ] `npm run lint:architecture` sem violações.
- [ ] GOV doc de encerramento criado.
- [ ] CHANGELOG atualizado.
