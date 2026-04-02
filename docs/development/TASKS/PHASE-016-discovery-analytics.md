# 🚀 Tasks — Fase 016: Event Discovery + Analytics do Organizador

**Status:** 🟢 CONCLUÍDA
**Última atualização:** 2026-04-02
**Sprint Atual:** Sprint 016
**Modo principal:** mixed (backend + frontend)
**Status Geral:** ✅ 100% (18/18 tarefas completas) — FASE CONCLUÍDA
**ETA:** 2 semanas
**Pré-requisito:** Fase 015 (✅ Concluída)
**Owner:** @jeandias
**Docs relacionadas:** `docs/development/SPRINTS/SPRINT-016.md`

---

## 📊 Resumo de Progresso

| Categoria | Total | Concluído | Em Andamento | Pendente | Bloqueado |
| --------- | ----- | --------- | ------------ | -------- | --------- |
| Schema & Migration | 2 | 2 | 0 | 0 | 0 |
| Backend Discovery | 3 | 3 | 0 | 0 | 0 |
| Backend Analytics | 3 | 3 | 0 | 0 | 0 |
| Frontend Discovery | 3 | 3 | 0 | 0 | 0 |
| Frontend Analytics | 3 | 3 | 0 | 0 | 0 |
| Tests | 4 | 4 | 0 | 0 | 0 |
| **TOTAL** | **18** | **18** | **0** | **0** | **0** |

### 🎯 Principais Indicadores
- ✅ Discovery entregue com filtros `q/date/location/category` e paginação dual (`page/limit` + cursor).
- ✅ Analytics do organizador entregue em `GET /api/events/:slug/analytics` com RBAC e ownership.
- ✅ UI pública com debounce, URL state sync e "Carregar mais" por `nextCursor`.
- ✅ Painel admin com KPIs, lotes e cupons integrado ao endpoint de analytics.

---

## 🎯 Objetivos da Fase

- Habilitar busca fulltext por título/localização e filtragem por data, categoria e localização na listagem pública de eventos.
- Substituir paginação offset por cursor-based pagination no endpoint `GET /api/events` para escalabilidade.
- Entregar endpoint `GET /api/events/:slug/analytics` com receita, ocupação por lote e redemptions de cupom.
- Entregar painel "Métricas" no admin dashboard com KPI cards e tabela de lotes por evento.
- Garantir cobertura de testes unitários e de integração para todos os novos comportamentos.

---

## 🗺️ Dependências, Batches e Caminho Crítico

### Dependências macro
- Sprint 015 concluída e mergeada no branch principal
- Schema de `events`, `lots`, `orders`, `order_items`, `tickets` e `coupons` estável
- Repositório `EventRepository` existente com `listPublished()` funcional
- Endpoint `GET /api/events` existente para extensão

### Caminho crítico
1. DISC-001 — Migration `category` + DISC-002 — Índices GIN (podem ser feitas em paralelo)
2. DISC-004 — `EventRepository.listPublished()` com cursor e filtros
3. DISC-003 — `ListPublishedEventsUseCase` atualizado
4. DISC-005 — `GET /api/events` com query params e validação Zod
5. DISC-009 / DISC-010 — Testes unitários e de integração de Discovery

### Paralelização possível
- Path Analytics (ANA-002 → ANA-001 → ANA-003) pode ser executado em paralelo com o path Discovery após DISC-001
- DISC-006, DISC-007, DISC-008 (Frontend Discovery) podem ser iniciados em paralelo após DISC-005 pronto
- ANA-004, ANA-005, ANA-006 (Frontend Analytics) podem ser iniciados após ANA-003 pronto
- DISC-009 (unit tests Discovery) e ANA-007 (unit tests Analytics) podem ser escritos em paralelo

### Checkpoints
- [x] Discovery concluído: schema mapeado, JOINs para analytics validados
- [x] Estratégia técnica validada: contratos de cursor pagination e payload de analytics definidos
- [x] Primeira batch implementada: DISC-001, DISC-002, DISC-004 completos
- [x] Integração validada: endpoints de Discovery e Analytics com testes passando
- [x] Encerramento pronto: frontend integrado, painel de métricas funcional, build verde

---

## 📦 Estrutura de Categorias

---

### 📦 Schema & Migration — Base de dados para Discovery

#### Objetivo
Adicionar o campo `category` na tabela `events` de forma backward compatible e criar índices GIN para habilitar fulltext search eficiente em `title` e `location` no PostgreSQL.

#### Escopo da categoria
- Migration Drizzle com coluna `category varchar(100) nullable`
- Migration com `CREATE INDEX CONCURRENTLY` para índices GIN em `title` e `location`
- Categorias sugeridas: shows, conferências, esportes, festas, educação, outros

#### Riscos da categoria
- `CREATE INDEX CONCURRENTLY` não pode ser executado dentro de uma transaction — verificar suporte do Drizzle para `sql` raw fora de transação
- Migration deve ser zero downtime — coluna nullable garante compatibilidade com registros existentes

---

- [x] **DISC-001** — Adicionar campo `category` na tabela `events`

  **Modo recomendado:** backend
  **Tipo:** infra

  **Descrição curta:**
  - Adicionar coluna `category varchar(100) nullable` na tabela `events` via migration Drizzle.
  - Garantir que a migration seja backward compatible (nullable, sem `DEFAULT` obrigatório).
  - Categorias sugeridas no schema como comentário: shows, conferências, esportes, festas, educação, outros.

  **Contexto mínimo:**
  - Sem o campo `category`, o filtro por tipo de evento é impossível na listagem pública
  - A coluna deve ser nullable para não quebrar registros existentes sem categoria
  - Drizzle ORM gerencia migrations em `drizzle/` com `db:push` ou `db:generate`

  **Implementação sugerida:**
  - Adicionar `category: varchar('category', { length: 100 })` no schema de `events`
  - Gerar migration com `npm run db:generate` e aplicar com `npm run db:push`
  - Verificar migration gerada antes de aplicar

  **Arquivos/áreas afetadas:** `src/server/infrastructure/db/schema/events.ts`, `drizzle/` (nova migration)

  **Critérios de aceitação:**
  - [ ] Campo `category` adicionado como `varchar(100) nullable`
  - [ ] Migration gerada e aplicada sem erro
  - [ ] Registros existentes sem `category` continuam acessíveis (`category = null`)
  - [ ] Schema TypeScript reflete o novo campo

  **Estratégia de teste:**
  - [ ] Integração: inserir evento com e sem `category`, verificar persistência
  - [ ] Regressão: `GET /api/events` sem `category` param continua retornando todos os eventos

  **Dependências:** Nenhuma
  **Bloqueia:** DISC-003, DISC-004, DISC-005
  **Pode rodar em paralelo com:** DISC-002, ANA-002

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Migration aplicada e versionada no repositório
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

- [x] **DISC-002** — Índices GIN em `events.title` e `events.location` para fulltext search

  **Modo recomendado:** backend
  **Tipo:** infra

  **Descrição curta:**
  - Criar índices GIN no PostgreSQL para habilitar fulltext search eficiente nas colunas `title` e `location` da tabela `events`.
  - Usar `CREATE INDEX CONCURRENTLY` para evitar lock em produção.
  - Implementar via migration Drizzle com `sql` raw.

  **Contexto mínimo:**
  - `ilike('%q%')` sem índice faz full table scan — inaceitável em produção com muitos eventos
  - GIN index com `pg_trgm` ou `tsvector` melhora drasticamente o desempenho de buscas fulltext
  - `CREATE INDEX CONCURRENTLY` não pode ser executado dentro de uma transaction

  **Implementação sugerida:**
  - Criar migration manual em `drizzle/` com `sql` raw
  - Executar `CREATE EXTENSION IF NOT EXISTS pg_trgm;` antes dos índices, se necessário
  - Criar `CREATE INDEX CONCURRENTLY idx_events_title_gin ON events USING gin(title gin_trgm_ops);`
  - Criar `CREATE INDEX CONCURRENTLY idx_events_location_gin ON events USING gin(location gin_trgm_ops);`

  **Arquivos/áreas afetadas:** `drizzle/` (nova migration com `sql` raw)

  **Critérios de aceitação:**
  - [ ] Índices GIN criados em `title` e `location`
  - [ ] Migration executada sem erro em ambiente de desenvolvimento
  - [ ] Query `ilike` com `%q%` usa os índices (verificar com `EXPLAIN ANALYZE`)

  **Estratégia de teste:**
  - [ ] Integração: executar migration e verificar existência dos índices no schema do banco

  **Dependências:** Nenhuma
  **Bloqueia:** DISC-004 (indiretamente — performance)
  **Pode rodar em paralelo com:** DISC-001, ANA-002

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Migration versionada no repositório
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

### 📦 Backend Discovery — Busca e filtragem de eventos

#### Objetivo
Estender o use-case de listagem de eventos e o repositório para suportar filtros por `q`, `date`, `location` e `category`, substituindo a paginação offset por cursor-based pagination com parâmetro `cursor`. Atualizar o handler do endpoint para expor os novos query params com validação Zod.

#### Escopo da categoria
- `ListPublishedEventsUseCase` com suporte a filtros e cursor
- `EventRepository.listPublished()` com WHERE conditions e cursor pagination
- `GET /api/events` com novos query params validados por Zod

#### Riscos da categoria
- Mudança na paginação do endpoint é breaking change para clientes que usam `offset/limit` — deve ser deprecado de forma consciente ou mantido em backward compat
- Filtro por `q` com `ilike` pode ser lento sem índice GIN (DISC-002 mitiga)

---

- [x] **DISC-003** — `ListPublishedEventsUseCase` atualizado com filtros e cursor pagination

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - Atualizar `ListPublishedEventsUseCase` para aceitar parâmetros de filtro (`q`, `date`, `location`, `category`) e `cursor`.
  - Retornar `{ events, nextCursor }` onde `nextCursor` é o `id` do último item retornado ou `null` se for a última página.
  - O use-case orquestra a chamada ao repositório com os filtros e calcula se há próxima página.

  **Contexto mínimo:**
  - Use-case deve permanecer framework-agnostic — recebe e retorna tipos simples
  - Cursor é o `id` (string/uuid) do último evento da página atual
  - `nextCursor = null` indica que não há mais resultados

  **Implementação sugerida:**
  - Adicionar tipo `ListPublishedEventsFilters` com campos opcionais `q`, `date`, `location`, `category`, `cursor`
  - Chamar `EventRepository.listPublished(filters)` e mapear resultado para `{ events, nextCursor }`
  - Verificar se `events.length < limit` para determinar se `nextCursor` é `null`

  **Arquivos/áreas afetadas:** `src/server/application/use-cases/list-published-events.use-case.ts`

  **Critérios de aceitação:**
  - [ ] Use-case aceita filtros `q`, `date`, `location`, `category`, `cursor`
  - [ ] Retorna `{ events, nextCursor: string | null }`
  - [ ] `nextCursor` é `null` quando não há mais resultados
  - [ ] Use-case não contém lógica de query de banco diretamente

  **Estratégia de teste:**
  - [ ] Unitário: mock do repositório retornando subsets, verificar `nextCursor`
  - [ ] Regressão: chamada sem filtros continua retornando eventos publicados

  **Dependências:** DISC-001, DISC-004
  **Bloqueia:** DISC-005, DISC-009
  **Pode rodar em paralelo com:** ANA-001, ANA-002

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes unitários adicionados e passando
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

- [x] **DISC-004** — `EventRepository.listPublished()` com cursor pagination e filtros

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - Atualizar `EventRepository.listPublished()` para aceitar filtros e cursor, construindo a query Drizzle com WHERE conditions e cursor pagination.
  - Cursor: `WHERE id > :cursor ORDER BY id LIMIT 20`.
  - Filtros: `ilike(title, '%q%') OR ilike(location, '%q%')` para `q`, `eq(category, :category)` para categoria, `gte(starts_at, :date)` para data.

  **Contexto mínimo:**
  - Repositório é o único lugar onde queries de banco são construídas
  - Drizzle suporta condições opcionais via `and(...)` com filtros undefined ignorados
  - `LIMIT 20 + 1` pode ser usado para detectar se há próxima página sem query adicional

  **Implementação sugerida:**
  - Receber `{ q, date, location, category, cursor }` como parâmetro opcional
  - Construir array de condições com `and(...)`, adicionando cada filtro se presente
  - Adicionar `WHERE id > cursor` quando cursor está presente
  - Retornar `{ events, hasMore }` ou `events` com length > limit para sinalizar próxima página

  **Arquivos/áreas afetadas:** `src/server/repositories/drizzle/event.drizzle-repository.ts`

  **Critérios de aceitação:**
  - [ ] Filtro `q` aplica `ilike` em `title` e `location` com OR
  - [ ] Filtro `category` aplica `eq(category, value)` apenas quando presente
  - [ ] Filtro `date` aplica `gte(starts_at, date)` quando presente
  - [ ] Cursor aplica `gt(id, cursor)` e retorna até 20 registros
  - [ ] Sem filtros, comportamento é idêntico ao anterior (backward compat)

  **Estratégia de teste:**
  - [ ] Integração: queries com cada filtro individualmente e combinados
  - [ ] Integração: cursor retorna segunda página a partir do último id da primeira

  **Dependências:** DISC-001, DISC-002
  **Bloqueia:** DISC-003
  **Pode rodar em paralelo com:** ANA-002

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes de integração adicionados e passando
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

- [x] **DISC-005** — `GET /api/events` atualizado com query params e validação Zod

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - Atualizar o handler de `GET /api/events` para aceitar query params `q`, `date`, `location`, `category`, `cursor`.
  - Validar todos os query params com Zod antes de repassar ao use-case.
  - Retornar `{ events, nextCursor }` no corpo da resposta.

  **Contexto mínimo:**
  - Handler deve ser thin — apenas validação de input, chamada ao use-case e serialização da resposta
  - Zod schema deve ter todos os campos como opcionais com tipos corretos
  - `date` deve ser validado como string ISO 8601 e convertido para `Date` antes de repassar

  **Implementação sugerida:**
  - Criar Zod schema `GetEventsQuerySchema` com campos opcionais: `q: z.string().optional()`, `date: z.string().datetime().optional()`, `location: z.string().optional()`, `category: z.string().optional()`, `cursor: z.string().optional()`
  - Extrair e validar `searchParams` da `Request`
  - Chamar `ListPublishedEventsUseCase` com filtros validados
  - Retornar `NextResponse.json({ events, nextCursor })`

  **Arquivos/áreas afetadas:** `src/app/api/events/route.ts`

  **Critérios de aceitação:**
  - [ ] Query params validados com Zod — input inválido retorna 400
  - [ ] Filtros repassados corretamente ao use-case
  - [ ] Resposta inclui `nextCursor` (`string | null`)
  - [ ] Handler sem lógica de negócio

  **Estratégia de teste:**
  - [ ] Integração: `GET /api/events?q=test&category=shows` retorna subset correto
  - [ ] Integração: `GET /api/events?date=invalida` retorna 400
  - [ ] Regressão: `GET /api/events` sem params continua funcionando

  **Dependências:** DISC-003
  **Bloqueia:** DISC-009, DISC-010, DISC-006
  **Pode rodar em paralelo com:** ANA-003

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes adicionados e passando
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

### 📦 Backend Analytics — Métricas de vendas por evento

#### Objetivo
Implementar o use-case `GetEventAnalyticsUseCase`, a query de repositório `EventRepository.getAnalytics()` e o endpoint `GET /api/events/:slug/analytics` para expor métricas consolidadas de receita, ocupação por lote e redemptions de cupom, com autenticação e verificação de ownership.

#### Escopo da categoria
- `GetEventAnalyticsUseCase` com orquestração e ownership check
- `EventRepository.getAnalytics(eventId)` com JOINs otimizados
- `GET /api/events/:slug/analytics` com auth organizer/admin

#### Riscos da categoria
- Query com múltiplos JOINs (`orders`, `order_items`, `tickets`, `lots`, `coupons`) pode ter impacto de performance — validar com `EXPLAIN ANALYZE` antes de deploy
- Ownership check deve verificar `event.organizerId === currentUser.id` para role `organizer`

---

- [x] **ANA-001** — `GetEventAnalyticsUseCase` — agregação de métricas do evento

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - Implementar `GetEventAnalyticsUseCase` que recebe `{ eventId, requestingUserId, requestingUserRole }` e retorna métricas consolidadas do evento.
  - Verificar ownership: se role for `organizer`, validar que `event.organizerId === requestingUserId`.
  - Retornar `{ totalRevenue, totalTickets, lotStats, couponStats }`.

  **Contexto mínimo:**
  - Use-case deve rejeitar acesso para role `customer` com erro de autorização
  - `totalRevenue` = soma de `orders.totalInCents` onde `orders.status = 'paid'`
  - `lotStats` = array de `{ lotId, title, sold, available, occupancyPct }` por lote do evento
  - `couponStats` = array de `{ code, redemptions }` para cupons usados no evento

  **Implementação sugerida:**
  - Validar role: se `customer`, lançar erro de autorização (403)
  - Se `organizer`, buscar evento e verificar `organizerId === requestingUserId`
  - Chamar `EventRepository.getAnalytics(eventId)` e mapear resultado para o shape de resposta
  - Calcular `occupancyPct = (sold / (sold + available)) * 100` para cada lote

  **Arquivos/áreas afetadas:** `src/server/application/use-cases/get-event-analytics.use-case.ts` (novo arquivo)

  **Critérios de aceitação:**
  - [ ] Use-case criado e exportado
  - [ ] Role `customer` resulta em erro de autorização
  - [ ] Role `organizer` com `organizerId` diferente resulta em erro de autorização
  - [ ] Role `admin` tem acesso a qualquer evento
  - [ ] Retorno contém `totalRevenue`, `totalTickets`, `lotStats`, `couponStats`

  **Estratégia de teste:**
  - [ ] Unitário: mock do repositório, verificar cálculo de `occupancyPct`
  - [ ] Unitário: verificar rejeição por role `customer` e organizer sem ownership

  **Dependências:** ANA-002
  **Bloqueia:** ANA-003, ANA-007
  **Pode rodar em paralelo com:** DISC-003, DISC-004

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes unitários adicionados e passando
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

- [x] **ANA-002** — `EventRepository.getAnalytics(eventId)` — query com JOINs agregados

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - Implementar `getAnalytics(eventId)` no `EventRepository` com query otimizada usando JOINs em `orders`, `order_items`, `tickets`, `lots` e `coupons`.
  - Retornar dados brutos necessários para o use-case calcular `totalRevenue`, `lotStats` e `couponStats`.

  **Contexto mínimo:**
  - Query deve filtrar por `events.id = eventId` e `orders.status = 'paid'`
  - `lots` com `capacity = null` indicam lote ilimitado — `occupancyPct` deve tratar esse caso
  - Cupons sem redemptions no evento não devem aparecer em `couponStats`

  **Implementação sugerida:**
  - Usar Drizzle com `leftJoin` em `lots ON lots.eventId = events.id`
  - Subquery ou segundo select para `orders JOIN order_items` por evento
  - Agregar por `lot_id` para calcular `sold` (count de tickets com status `used` ou `active`)
  - Agregar redemptions de cupom por `coupon.code` via `orders.couponId`
  - Retornar `{ totalRevenueCents, totalTickets, lots: [...], coupons: [...] }`

  **Arquivos/áreas afetadas:** `src/server/repositories/drizzle/event.drizzle-repository.ts`

  **Critérios de aceitação:**
  - [ ] `getAnalytics(eventId)` implementado no repositório
  - [ ] `totalRevenueCents` = soma de `totalInCents` de orders `paid`
  - [ ] `lots` retorna array com `sold` e `available` por lote
  - [ ] `coupons` retorna array com `code` e `redemptions`
  - [ ] Evento sem vendas retorna `totalRevenueCents = 0` e arrays vazios

  **Estratégia de teste:**
  - [ ] Integração: criar evento com pedidos pagos e verificar totais
  - [ ] Integração: evento sem pedidos retorna zeros

  **Dependências:** DISC-001 (schema de events estável)
  **Bloqueia:** ANA-001
  **Pode rodar em paralelo com:** DISC-004

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes de integração adicionados e passando
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

- [x] **ANA-003** — `GET /api/events/:slug/analytics` — handler com auth organizer/admin

  **Modo recomendado:** backend
  **Tipo:** feature

  **Descrição curta:**
  - Criar rota `GET /api/events/[slug]/analytics/route.ts` com autenticação obrigatória.
  - Verificar que o usuário autenticado tem role `organizer` ou `admin`.
  - Chamar `GetEventAnalyticsUseCase` e retornar o payload de métricas.

  **Contexto mínimo:**
  - Handler deve extrair `userId` e `role` da sessão autenticada — nunca do body/query
  - Slug é resolvido para `eventId` no handler antes de chamar o use-case
  - Erros de autorização do use-case devem ser mapeados para 403

  **Implementação sugerida:**
  - Criar `src/app/api/events/[slug]/analytics/route.ts`
  - Verificar sessão com helper de auth existente; retornar 401 se não autenticado
  - Resolver `slug` para `event` via repositório; retornar 404 se não encontrado
  - Chamar `GetEventAnalyticsUseCase` com `eventId`, `requestingUserId`, `requestingUserRole`
  - Mapear erros de autorização para 403, outros erros para 500

  **Arquivos/áreas afetadas:** `src/app/api/events/[slug]/analytics/route.ts` (novo arquivo)

  **Critérios de aceitação:**
  - [ ] Rota criada em `src/app/api/events/[slug]/analytics/route.ts`
  - [ ] 401 para request sem sessão autenticada
  - [ ] 403 para role `customer`
  - [ ] 404 para slug inexistente
  - [ ] 200 com payload de analytics para `organizer` com ownership ou `admin`

  **Estratégia de teste:**
  - [ ] Integração: request autenticado como admin retorna analytics
  - [ ] Integração: request autenticado como customer retorna 403
  - [ ] Integração: request sem auth retorna 401

  **Dependências:** ANA-001
  **Bloqueia:** ANA-008, ANA-004
  **Pode rodar em paralelo com:** DISC-005

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes adicionados e passando
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

### 📦 Frontend Discovery — Busca e filtros na listagem pública

#### Objetivo
Implementar search bar com debounce e URL state sync, dropdowns de filtro de data/localização/categoria e infinite scroll com cursor pagination na home page de eventos, conectando ao backend de Discovery atualizado.

#### Escopo da categoria
- Componente `EventSearch` com search bar e debounce 300ms
- Dropdowns de filtro com URL state sync
- Infinite scroll / "Carregar mais" com cursor pagination

#### Riscos da categoria
- URL state sync deve preservar filtros no refresh e navegação — usar `useSearchParams` do Next.js
- Debounce no search bar deve evitar chamadas excessivas sem atrasar a resposta para o usuário

---

- [x] **DISC-006** — Search bar na home page com debounce 300ms e URL state sync

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Criar componente `EventSearch` com input de busca que aplica debounce de 300ms antes de atualizar o query param `q` na URL.
  - URL state sync permite compartilhar a busca por link e preservar estado no refresh.
  - Ao alterar `q` na URL, a listagem de eventos é refetched com o novo valor.

  **Contexto mínimo:**
  - Usar `useSearchParams` e `useRouter` para sincronizar estado com a URL
  - Debounce via `setTimeout` / `clearTimeout` ou hook `useDebounce` customizado
  - Componente deve ser uncontrolled para evitar re-renders excessivos durante digitação

  **Implementação sugerida:**
  - Criar `src/features/events/event-search.tsx` com input controlado e debounce
  - Ao confirmar debounce, chamar `router.push(?q=value)` preservando outros params
  - Integrar na `src/app/page.tsx` acima da listagem de eventos

  **Arquivos/áreas afetadas:** `src/app/page.tsx`, `src/features/events/event-search.tsx` (novo)

  **Critérios de aceitação:**
  - [ ] Digitação na search bar não dispara request antes de 300ms de inatividade
  - [ ] Valor de `q` é refletido na URL como query param
  - [ ] Ao limpar o campo, param `q` é removido da URL
  - [ ] Listagem recarrega com resultados filtrados após debounce

  **Estratégia de teste:**
  - [ ] Unitário: hook de debounce com timer mocked
  - [ ] Regressão: listagem sem busca continua exibindo todos os eventos

  **Dependências:** DISC-005
  **Bloqueia:** DISC-007 (depende do padrão de URL state estabelecido)
  **Pode rodar em paralelo com:** ANA-004

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes adicionados e passando
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

- [x] **DISC-007** — Filtros de data, localização e categoria com URL state sync

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Implementar dropdowns de filtro para `date`, `location` e `category` na home page de eventos.
  - Cada filtro atualiza o query param correspondente na URL (URL state sync).
  - Filtros combinados com `q` funcionam em conjunto na mesma query string.

  **Contexto mínimo:**
  - Usar `useSearchParams` para ler/escrever múltiplos params sem perder os existentes
  - `date` deve ser um date picker ou input de data com formato ISO 8601
  - `category` deve ser um select com as categorias: shows, conferências, esportes, festas, educação, outros

  **Implementação sugerida:**
  - Criar componente `EventFilters` com select de categoria, input de data e input de localização
  - Ao alterar qualquer filtro, atualizar URL preservando os demais params existentes
  - Integrar `EventFilters` na `src/app/page.tsx` junto ao `EventSearch`

  **Arquivos/áreas afetadas:** `src/app/page.tsx`, `src/features/events/event-filters.tsx` (novo)

  **Critérios de aceitação:**
  - [ ] Filtro de categoria atualiza URL com `?category=shows`
  - [ ] Filtro de data atualiza URL com `?date=2026-05-01`
  - [ ] Filtro de localização atualiza URL com `?location=São+Paulo`
  - [ ] Filtros combinados coexistem na URL sem sobrescrever uns aos outros
  - [ ] Limpar filtro remove o param da URL

  **Estratégia de teste:**
  - [ ] Integração: aplicar filtros e verificar URL resultante
  - [ ] Regressão: remover filtros retorna para listagem completa

  **Dependências:** DISC-005, DISC-006
  **Bloqueia:** DISC-008
  **Pode rodar em paralelo com:** ANA-004, ANA-005

  **Prioridade:** 🟡 Alta
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes adicionados e passando
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

- [x] **DISC-008** — Infinite scroll / "Carregar mais" com cursor pagination

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Implementar botão "Carregar mais" ou infinite scroll na listagem de eventos da home, usando `nextCursor` da resposta do endpoint para buscar a próxima página.
  - Quando `nextCursor = null`, o botão deve ser ocultado ou desativado.
  - Eventos carregados são acumulados na listagem sem substituir os anteriores.

  **Contexto mínimo:**
  - `nextCursor` é o `id` do último evento retornado — deve ser passado como `?cursor=value` na próxima request
  - Estado de paginação é local ao componente — não precisa ser sincronizado na URL
  - Filtros ativos devem ser preservados ao carregar mais resultados

  **Implementação sugerida:**
  - Manter estado `events: Event[]` e `cursor: string | null` no componente de listagem
  - Ao clicar em "Carregar mais", fazer fetch com filtros atuais + `cursor` atual
  - Acumular novos eventos com `setEvents(prev => [...prev, ...newEvents])`
  - Esconder botão quando `nextCursor === null`

  **Arquivos/áreas afetadas:** `src/app/page.tsx`, `src/features/events/event-list.tsx`

  **Critérios de aceitação:**
  - [ ] Primeira carga exibe os primeiros 20 eventos
  - [ ] "Carregar mais" carrega os próximos 20 eventos sem substituir os anteriores
  - [ ] Botão desaparece quando `nextCursor = null` (última página)
  - [ ] Filtros ativos são preservados ao carregar mais resultados

  **Estratégia de teste:**
  - [ ] Unitário: hook de paginação com mock de fetch, verificar acumulação de eventos

  **Dependências:** DISC-005, DISC-007
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** ANA-004, ANA-005, ANA-006

  **Prioridade:** 🟢 Média
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes adicionados e passando
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

### 📦 Frontend Analytics — Painel de métricas no admin

#### Objetivo
Implementar painel "Métricas" no admin dashboard com KPI cards de receita total, tickets vendidos e ocupação geral, tabela de lotes com detalhes de ocupação e lista de cupons com redemption count, consumindo o endpoint `GET /api/events/:slug/analytics`.

#### Escopo da categoria
- KPI cards: receita total, tickets vendidos, % ocupação geral
- Tabela de lotes: nome, preço, vendido, disponível, % ocupação
- Lista de cupons com redemption count e % de uso

#### Riscos da categoria
- Dados de receita em centavos devem ser formatados como moeda (R$) no frontend
- Ocupação geral (header) é calculada como média ou agregado dos lotes — definir comportamento para lotes com `capacity = null`

---

- [x] **ANA-004** — Painel "Métricas" no admin com KPI cards

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Adicionar aba ou seção "Métricas" na página admin do evento com três KPI cards: receita total formatada em R$, total de tickets vendidos e % de ocupação geral (média ponderada dos lotes).
  - Dados consumidos do endpoint `GET /api/events/:slug/analytics`.
  - Exibir estado de loading e de erro adequados.

  **Contexto mínimo:**
  - `totalRevenue` chega em centavos — converter para R$ no frontend com `Intl.NumberFormat`
  - `occupancyPct` geral = média da `occupancyPct` de todos os lotes com capacidade definida
  - Acesso à aba só deve ser renderizado para roles `organizer` e `admin`

  **Implementação sugerida:**
  - Criar componente `AnalyticsPanel` em `src/features/admin/analytics-panel.tsx`
  - Fazer fetch de `/api/events/:slug/analytics` com credenciais
  - Renderizar três `KpiCard` componentes com ícone, label e valor formatado
  - Integrar `AnalyticsPanel` em `src/app/admin/page.tsx`

  **Arquivos/áreas afetadas:** `src/app/admin/page.tsx`, `src/features/admin/analytics-panel.tsx` (novo)

  **Critérios de aceitação:**
  - [ ] Painel exibe receita total em R$ formatado
  - [ ] Painel exibe total de tickets vendidos
  - [ ] Painel exibe % de ocupação geral
  - [ ] Estado de loading exibido durante fetch
  - [ ] Estado de erro exibido com mensagem clara em caso de falha

  **Estratégia de teste:**
  - [ ] Unitário: componente `AnalyticsPanel` com dados mockados
  - [ ] Regressão: página admin continua funcional quando analytics falha (graceful error)

  **Dependências:** ANA-003
  **Bloqueia:** ANA-005
  **Pode rodar em paralelo com:** DISC-006, DISC-007, DISC-008

  **Prioridade:** 🟡 Alta
  **Estimativa:** 3h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes adicionados e passando
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

- [x] **ANA-005** — Tabela de lotes com colunas de ocupação

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Renderizar tabela de lotes dentro do `AnalyticsPanel` com colunas: nome, preço, vendido, disponível e % ocupação.
  - Dados oriundos de `lotStats` do payload de analytics.
  - Lotes com `capacity = null` (ilimitados) exibem "Ilimitado" na coluna disponível e sem % ocupação.

  **Contexto mínimo:**
  - `lotStats` é array de `{ lotId, title, sold, available, occupancyPct }`
  - Preço deve ser formatado como R$ (em centavos no backend, formatado no frontend)
  - Tabela deve ter ordenação visual por % de ocupação (opcional mas recomendado)

  **Implementação sugerida:**
  - Adicionar seção de tabela no `AnalyticsPanel` após os KPI cards
  - Usar componente de tabela do shadcn/ui existente no projeto
  - Tratar `available = null` exibindo "Ilimitado" e `occupancyPct = null` exibindo "—"

  **Arquivos/áreas afetadas:** `src/features/admin/analytics-panel.tsx`

  **Critérios de aceitação:**
  - [ ] Tabela exibe todas as colunas: nome, preço, vendido, disponível, % ocupação
  - [ ] Lotes ilimitados exibem "Ilimitado" e "—" nas colunas correspondentes
  - [ ] Tabela exibe mensagem "Nenhum lote cadastrado" quando `lotStats` é vazio

  **Estratégia de teste:**
  - [ ] Unitário: componente com array de lotes mockado incluindo lote ilimitado

  **Dependências:** ANA-003, ANA-004
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** ANA-006, DISC-008

  **Prioridade:** 🟡 Alta
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes adicionados e passando
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

- [x] **ANA-006** — Lista de cupons com redemption count e % de uso

  **Modo recomendado:** frontend
  **Tipo:** feature

  **Descrição curta:**
  - Renderizar seção de cupons no `AnalyticsPanel` com lista de `{ code, redemptions }` e percentual de uso calculado em relação ao total de pedidos pagos.
  - Exibir mensagem "Nenhum cupom utilizado neste evento" quando `couponStats` estiver vazio.

  **Contexto mínimo:**
  - `couponStats` é array de `{ code, redemptions }` do payload de analytics
  - % de uso = `(redemptions / totalTickets) * 100` — calcular no frontend com os dados do payload
  - Seção de cupons é opcional no layout — exibir apenas quando `couponStats.length > 0`

  **Implementação sugerida:**
  - Adicionar seção de cupons abaixo da tabela de lotes no `AnalyticsPanel`
  - Renderizar lista simples ou tabela com `code`, `redemptions` e `% de uso`
  - Esconder seção quando array vazio ou renderizar mensagem de estado vazio

  **Arquivos/áreas afetadas:** `src/features/admin/analytics-panel.tsx`

  **Critérios de aceitação:**
  - [ ] Lista exibe `code`, `redemptions` e `% de uso` para cada cupom
  - [ ] Seção exibe mensagem de estado vazio quando não há cupons utilizados
  - [ ] `% de uso` calculado corretamente em relação ao total de tickets vendidos

  **Estratégia de teste:**
  - [ ] Unitário: componente com array de cupons mockado e com array vazio

  **Dependências:** ANA-003, ANA-004
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** ANA-005, DISC-008

  **Prioridade:** 🟢 Média
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Implementação concluída
  - [ ] Testes adicionados e passando
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

### 📦 Tests — Cobertura unitária e de integração

#### Objetivo
Garantir cobertura de testes para todos os novos comportamentos de Discovery e Analytics, seguindo TDD — testes são escritos antes da implementação para guiar o design.

#### Escopo da categoria
- Testes unitários: use-cases de Discovery e Analytics com mocks de repositório
- Testes de integração: endpoints `GET /api/events` (filtros combinados) e `GET /api/events/:slug/analytics` (auth)

#### Riscos da categoria
- Testes de integração dependem de banco de dados de teste configurado com schema atualizado (incluindo `category`)
- Fixtures de teste devem cobrir cenários de eventos com zero vendas, lotes sold_out e cupons sem uso

---

- [x] **DISC-009** — Unit tests: `ListPublishedEventsUseCase` com filtros e cursor

  **Modo recomendado:** backend
  **Tipo:** test

  **Descrição curta:**
  - Escrever testes unitários para `ListPublishedEventsUseCase` cobrindo: filtros individuais e combinados, comportamento do `nextCursor` (presente e `null`), e backward compat sem filtros.
  - Repositório mockado com dados de fixture.

  **Contexto mínimo:**
  - Testes escritos antes da implementação (RED first)
  - Mock do repositório deve simular retorno com e sem eventos adicionais após o cursor
  - Verificar que `nextCursor` é `null` quando `events.length < limit`

  **Implementação sugerida:**
  - Criar `tests/unit/server/application/use-cases/list-published-events.test.ts`
  - Mock de `EventRepository` via jest/vitest mock factory
  - Fixture com 20 eventos para testar presença de `nextCursor` e 5 para ausência

  **Arquivos/áreas afetadas:** `tests/unit/server/application/use-cases/list-published-events.test.ts`

  **Critérios de aceitação:**
  - [ ] Teste verifica `nextCursor` presente quando há mais eventos
  - [ ] Teste verifica `nextCursor = null` quando não há mais eventos
  - [ ] Teste verifica filtragem por `q`, `category`, `date` e `location` via mock
  - [ ] Testes passam após implementação de DISC-003

  **Estratégia de teste:**
  - [ ] Unitário (escopo desta task)

  **Dependências:** DISC-003 (para GREEN)
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** ANA-007

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Testes escritos (RED confirmado antes da implementação)
  - [ ] Testes passando após implementação
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

- [x] **ANA-007** — Unit tests: `GetEventAnalyticsUseCase` com dados de fixture

  **Modo recomendado:** backend
  **Tipo:** test

  **Descrição curta:**
  - Escrever testes unitários para `GetEventAnalyticsUseCase` cobrindo: cálculo correto de `totalRevenue`, `occupancyPct` por lote, rejeição por role `customer`, rejeição por organizer sem ownership e acesso de admin a qualquer evento.

  **Contexto mínimo:**
  - Testes escritos antes da implementação (RED first)
  - Fixture com evento com 2 lotes (um com 100% ocupação, outro com 50%) e 2 cupons usados
  - Verificar que receita = soma de `totalInCents` dos orders `paid` apenas

  **Implementação sugerida:**
  - Criar `tests/unit/server/application/use-cases/get-event-analytics.test.ts`
  - Fixture: evento com `organizerId = 'org-1'`, 2 lotes, 2 orders pagos
  - Testar acesso com `requestingUserId = 'org-1'` (owner), `org-2` (não owner) e `admin-1`

  **Arquivos/áreas afetadas:** `tests/unit/server/application/use-cases/get-event-analytics.test.ts` (novo)

  **Critérios de aceitação:**
  - [ ] `occupancyPct` calculado corretamente para lotes com capacidade definida
  - [ ] Acesso com role `customer` lança erro de autorização
  - [ ] Acesso de organizer sem ownership lança erro de autorização
  - [ ] Acesso de admin retorna analytics independente de ownership
  - [ ] Testes passam após implementação de ANA-001

  **Estratégia de teste:**
  - [ ] Unitário (escopo desta task)

  **Dependências:** ANA-001 (para GREEN)
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** DISC-009

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Testes escritos (RED confirmado antes da implementação)
  - [ ] Testes passando após implementação
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

- [x] **DISC-010** — Integration tests: `GET /api/events` com filtros combinados

  **Modo recomendado:** backend
  **Tipo:** test

  **Descrição curta:**
  - Escrever testes de integração para `GET /api/events` cobrindo: busca por `q`, filtro por `category`, filtro por `date`, filtros combinados `q + date + category`, cursor pagination (primeira e última página) e caso sem filtros (backward compat).

  **Contexto mínimo:**
  - Testes de integração requerem banco de dados de teste com schema atualizado (incluindo `category`)
  - Seed de dados: pelo menos 3 eventos em categorias diferentes, em datas diferentes, com títulos únicos
  - Verificar que resposta inclui `nextCursor` no formato correto

  **Implementação sugerida:**
  - Criar `tests/integration/api/events/get-events.test.ts`
  - Seed: `festival-rock` (shows, 2026-05-01, São Paulo), `palestra-tech` (conferências, 2026-06-01, Recife), `corrida` (esportes, 2026-07-01, Fortaleza)
  - Testar: `?q=festival`, `?category=shows`, `?date=2026-05-01`, `?q=festival&category=shows`

  **Arquivos/áreas afetadas:** `tests/integration/api/events/get-events.test.ts`

  **Critérios de aceitação:**
  - [ ] `?q=festival` retorna apenas evento com "festival" no título ou localização
  - [ ] `?category=shows` retorna apenas eventos da categoria `shows`
  - [ ] Filtros combinados retornam interseção correta
  - [ ] Cursor pagination retorna `nextCursor` não-nulo na primeira página com 20+ eventos
  - [ ] `GET /api/events` sem params retorna todos os eventos publicados (regressão)

  **Estratégia de teste:**
  - [ ] Integração (escopo desta task)

  **Dependências:** DISC-005
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** ANA-008

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 2h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Testes escritos antes da implementação completa (RED confirmado)
  - [ ] Testes passando após implementação
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

- [x] **ANA-008** — Integration tests: `GET /api/events/:slug/analytics` com auth organizer

  **Modo recomendado:** backend
  **Tipo:** test

  **Descrição curta:**
  - Escrever testes de integração para `GET /api/events/:slug/analytics` cobrindo: acesso autenticado como admin, acesso como organizer com ownership, acesso como organizer sem ownership (403), acesso como customer (403) e acesso sem autenticação (401).

  **Contexto mínimo:**
  - Testes requerem seed com evento vinculado a um organizer específico e ao menos um pedido pago
  - Sessão de teste mockada ou via helper de auth de teste existente no projeto
  - Verificar payload completo: `totalRevenue`, `lotStats`, `couponStats`

  **Implementação sugerida:**
  - Criar `tests/integration/api/events/get-analytics.test.ts`
  - Seed: evento `slug = 'festival-rock'`, `organizerId = 'org-1'`, 1 pedido pago com R$ 150,00
  - Testar 5 cenários de acesso listados acima com sessões diferentes

  **Arquivos/áreas afetadas:** `tests/integration/api/events/get-analytics.test.ts` (novo)

  **Critérios de aceitação:**
  - [ ] Admin recebe 200 com payload completo de analytics
  - [ ] Organizer com ownership recebe 200 com payload correto
  - [ ] Organizer sem ownership recebe 403
  - [ ] Customer recebe 403
  - [ ] Request sem autenticação recebe 401

  **Estratégia de teste:**
  - [ ] Integração (escopo desta task)

  **Dependências:** ANA-003
  **Bloqueia:** Nenhuma
  **Pode rodar em paralelo com:** DISC-010

  **Prioridade:** 🔴 Crítica
  **Estimativa:** 1h
  **Responsável:** @jeandias
  **Status:** ✅ Concluída

  **Definição de pronto:**
  - [ ] Testes escritos antes da implementação completa (RED confirmado)
  - [ ] Testes passando após implementação
  - [ ] Critérios de aceitação atendidos
  - [ ] Sem violação arquitetural evidente

---

## 🧪 Testes e Validações

- **Suites necessárias:** unit, integration, build, lint:architecture
- **Cobertura alvo:** >80% de branches nos use-cases de Discovery e Analytics; 100% dos cenários de auth no endpoint de analytics
- **Comandos de verificação:**
  - `bun run test:unit`
  - `bun run test:integration`
  - `bun run lint:architecture`
  - `bun run build`
  - `bun run db:migrate`
- **Estado atual:** ✅ Concluída em desenvolvimento local
- **Fluxos críticos a validar manualmente:**
  - Comprador pesquisa "festival" → resultados filtrados em < 500ms
  - Comprador filtra por data + categoria → listagem atualiza corretamente
  - Comprador chega ao fim da listagem → "Carregar mais" desaparece quando `nextCursor = null`
  - Organizer acessa aba "Métricas" → vê receita total, tickets vendidos e % ocupação por lote
  - Customer tenta acessar analytics → recebe 403

---

## 🔍 Riscos, Bloqueios e Decisões

### Bloqueios atuais
- Nenhum bloqueio ativo no início da sprint

### Riscos em aberto
- Query de analytics com múltiplos JOINs pode ter impacto de performance em eventos com muitos pedidos — mitigar com `EXPLAIN ANALYZE` antes do deploy
- Índices GIN foram aplicados via migration manual com `pg_trgm` para `title` e `location`
- Cursor pagination muda o contrato de resposta do `GET /api/events` — validar que nenhum cliente existente usa `offset/limit` antes de remover suporte

### Decisões importantes
- Cursor pagination usa token composto `startsAt + id` (base64url) para manter ordenação cronológica estável
- Campo `category` é `varchar(100) nullable` — sem enum no banco para facilitar adição de novas categorias sem migration futura
- Analytics endpoint recebe `slug` no handler e resolve evento no use-case para preservar boundary de camada API
- Receita em centavos permanece como inteiro no backend — conversão para moeda formatada feita exclusivamente no frontend

---

## 📚 Documentação e Comunicação

- [x] Atualizar `docs/development/TASKS.md` com Fase 016
- [x] Atualizar `docs/development/CHANGELOG.md` ao encerrar a fase
- [x] Referenciar fechamento técnico em `docs/development/Logs/GOV-010-phase-016.md`
- [x] Atualizar docs de schema com o novo campo `category` em `events`
- [x] Registrar decisão de cursor pagination vs offset pagination no changelog técnico
- [x] Registrar decisão de `category` como varchar (não enum) nos docs de schema

---

## ✅ Checklist de Encerramento da Fase

- [x] Todas as tarefas críticas (🔴) concluídas
- [x] Tasks pendentes de prioridade média (🟢) replanejadas ou formalmente adiadas
- [x] Migration de `category` aplicada e versionada no repositório
- [x] Índices GIN criados e validados com `EXPLAIN ANALYZE`
- [x] Testes unitários passando (`bun run test:unit`)
- [x] Testes de integração passando (`bun run test:integration`)
- [x] Fluxos críticos validados manualmente (busca, filtros, métricas) — homologação local em 2026-04-02 com evidências em `/tmp/phase16_validation_summary.json` e screenshots `evidence-phase16-*.png`
- [x] Documentação de schema e API atualizada
- [x] Revisão de segurança: auth e ownership check validados no backend
- [x] Aprovação final registrada
- [x] Changelog atualizado
