---
title: Sprint 016 — Event Discovery + Analytics do Organizador
type: sprint
mode: mixed
approach: tdd-first
status: planned
---

# Sprint 016 — Event Discovery + Analytics do Organizador

## 1. Objetivo

Entregar busca fulltext e filtragem de eventos com cursor pagination para compradores, e painel de métricas de vendas consolidadas (receita, ocupação por lote, efetividade de cupons) para organizadores no admin.

---

## 2. Resumo Executivo

- **Tipo da sprint:** mixed (feature + infra)
- **Modo principal do Agent OS:** mixed (backend + frontend)
- **Fase relacionada:** Fase 016 — Event Discovery + Organizer Analytics
- **Status:** 🟢 Planejada
- **Prioridade:** 🟡 Alta
- **Owner principal:** @jeandias
- **Dependências externas:** Sprint 015 ✅
- **Janela estimada:** 2 semanas

---

## 3. Contexto

- **Problema atual (Discovery):** listagem de eventos é flat, sem busca ou filtros — inviável com muitos eventos; paginação offset-based escala mal para grandes volumes (drift problem); eventos não têm categorização, impossível filtrar por tipo.
- **Problema atual (Analytics):** organizador não tem visão de receita, ocupação por lote ou efetividade de cupons; admin dashboard mostra apenas lista bruta de pedidos sem KPIs acionáveis; sem dados, organizer não sabe quais lotes performam melhor ou quais cupons funcionam.
- **Impacto no sistema/produto:** compradores não encontram eventos relevantes em catálogos maiores; organizadores não conseguem otimizar estratégia de preços e cupons sem métricas.
- **Riscos envolvidos:** fulltext search com GIN index requer migration com `CREATE INDEX CONCURRENTLY`; cursor pagination muda o contrato de resposta do endpoint `GET /api/events`; query de analytics com JOINs múltiplos pode ter impacto de performance em volumes altos.
- **Áreas afetadas:** `src/server/infrastructure/db/schema/events.ts`, `src/server/repositories/drizzle/`, `src/server/application/use-cases/`, `src/app/api/events/`, `src/app/admin/`, `src/features/`
- **Fluxos de usuário impactados:** listagem pública de eventos, busca e filtragem por comprador, dashboard admin do organizador.
- **Premissas importantes:** Drizzle suporta `sql` raw para índices GIN; cursor pagination usa `id` como campo de cursor; analytics endpoint requer role `organizer` ou `admin` com verificação de ownership do evento.
- **Fora de escopo nesta sprint:** BI externo, exportação de dados, relatórios PDF, analytics de visitors/pageviews.

---

## 4. Critérios de Sucesso

- [ ] `GET /api/events?q=título&date=2026-05-01&location=São+Paulo&category=shows` retorna resultados filtrados corretamente
- [ ] Paginação cursor-based funcionando: parâmetro `cursor` presente na resposta e aceito na próxima requisição
- [ ] Campo `category` adicionado na tabela `events` com migration Drizzle aplicada e backward compatible
- [ ] `GET /api/events/:slug/analytics` retorna receita total, tickets vendidos, ocupação % por lote e top cupons usados
- [ ] UI: search bar com debounce 300ms e filtros de data/localização/categoria com URL state sync na home
- [ ] UI: painel "Métricas" no admin com cards de KPI e tabela de lotes por evento
- [ ] Testes unitários e de integração cobrindo todos os novos endpoints e use-cases

---

## 5. Dependências e Sequenciamento

### Dependências de entrada
- [ ] Sprint 015 concluída e mergeada
- [ ] Schema atual de `events`, `orders`, `order_items`, `tickets`, `lots` e `coupons` estável
- [ ] Repositório `EventRepository` existente e funcional
- [ ] Endpoint `GET /api/events` existente para extensão

### Ordem macro recomendada
1. Discovery técnico: mapear schema atual, repositório de eventos e endpoint existente
2. Estratégia de comportamento e testes: definir contratos de cursor pagination e formato de analytics
3. RED tests: escrever testes para use-cases e endpoints antes da implementação
4. Schema & Migration: `category` + índices GIN
5. Implementação backend: use-cases, repositórios, handlers
6. Implementação frontend: search bar, filtros, infinite scroll, painel de métricas
7. Refatoração e validação final

### Paralelização possível
- Path Discovery (DISC-001 → DISC-004 → DISC-003 → DISC-005) e Path Analytics (ANA-002 → ANA-001 → ANA-003) podem ser executados em paralelo após DISC-001
- Frontend Discovery (DISC-006, DISC-007, DISC-008) e Frontend Analytics (ANA-004, ANA-005, ANA-006) podem ser executados em paralelo após os endpoints correspondentes estarem prontos
- Testes unitários de Discovery (DISC-009) e Analytics (ANA-007) podem ser escritos em paralelo

### Caminho crítico
- DISC-001 → DISC-004 → DISC-003 → DISC-005 → DISC-009 → DISC-010
- ANA-002 → ANA-001 → ANA-003 → ANA-007 → ANA-008 (paralelo com path Discovery após DISC-001)

---

## 6. Etapa 1 — Discovery Técnico

### Objetivo
Mapear o impacto real da adição de busca/filtros no endpoint de eventos e das queries de agregação no repositório antes de implementar.

### Checklist
- [ ] Analisar schema atual de `events` e identificar campos disponíveis para filtros (`title`, `location`, `starts_at`, `status`)
- [ ] Confirmar ausência do campo `category` e estratégia de migration nullable
- [ ] Avaliar suporte do Drizzle ao `sql` raw para `CREATE INDEX CONCURRENTLY`
- [ ] Mapear `ListPublishedEventsUseCase` atual e contrato de resposta do `GET /api/events`
- [ ] Verificar relações entre `events`, `lots`, `orders`, `order_items`, `tickets` e `coupons` para a query de analytics
- [ ] Confirmar middleware de auth e ownership check disponíveis para o endpoint de analytics
- [ ] Identificar edge cases: evento sem vendas, lote com `capacity = null`, cupom sem redemptions

### Saída esperada
- Schema de `events` mapeado com campos disponíveis para filtros
- Estratégia de cursor pagination definida (cursor = `id`, `WHERE id > :cursor ORDER BY id LIMIT 20`)
- Estrutura de JOINs para query de analytics validada
- Riscos de performance para índices GIN e query de analytics conhecidos

---

## 7. Etapa 2 — Design de Comportamento e Estratégia de Testes

### Objetivo
Definir contratos verificáveis para busca/filtros e para o payload de analytics antes de qualquer implementação.

### Checklist
- [ ] Definir contrato de resposta do `GET /api/events` com cursor pagination: `{ events: [...], nextCursor: string | null }`
- [ ] Definir schema Zod para query params: `q`, `date`, `location`, `category`, `cursor`
- [ ] Definir contrato de resposta do `GET /api/events/:slug/analytics`: `{ totalRevenue, totalTickets, lotStats, couponStats }`
- [ ] Definir critérios de aceite testáveis para filtros combinados
- [ ] Confirmar que analytics retorna 403 para role `customer`
- [ ] Confirmar que analytics verifica ownership do evento para `organizer`
- [ ] Definir comportamento quando nextCursor é `null` (última página)

### Casos de teste planejados
- [ ] Busca por `q=rock` retorna apenas eventos com "rock" no título ou localização
- [ ] Filtro `category=shows` retorna apenas eventos da categoria `shows`
- [ ] Cursor pagination: primeira página retorna `nextCursor`, última página retorna `nextCursor=null`
- [ ] Analytics: `totalRevenue` = soma dos `totalInCents` dos orders com status `paid`
- [ ] Analytics endpoint retorna `403` para role `customer`
- [ ] Evento com todos os lotes `sold_out` tem 100% de ocupação em `lotStats`
- [ ] Filtros combinados `q + date + category` funcionam corretamente no mesmo request

### Matriz de testes
| Tipo | Escopo | Obrigatório? | Observações |
|------|--------|--------------|-------------|
| Unitário | `ListPublishedEventsUseCase`, `GetEventAnalyticsUseCase` | Sim | Filtros, cursor, agregações |
| Integração | `GET /api/events`, `GET /api/events/:slug/analytics` | Sim | Filtros combinados, auth |
| E2E | Busca na home, painel de métricas no admin | Não | Fora de escopo nesta sprint |
| Regressão | Fluxo de compra, listagem de eventos sem filtros | Sim | Garantir backward compat |
| Auth/AuthZ | Analytics endpoint para `customer`, `organizer`, `admin` | Sim | Ownership check para organizer |

---

## 8. Etapa 3 — Testes Primeiro (TDD)

### Objetivo
Criar testes RED que representem o comportamento esperado de filtros, cursor pagination e agregação de analytics.

### Checklist
- [ ] Escrever testes unitários para `ListPublishedEventsUseCase` com filtros e cursor antes da implementação
- [ ] Escrever testes unitários para `GetEventAnalyticsUseCase` com dados de fixture
- [ ] Escrever testes de integração para `GET /api/events` com query params combinados
- [ ] Escrever testes de integração para `GET /api/events/:slug/analytics` com auth organizer
- [ ] Garantir que testes falhem pelo motivo correto (use-case/repositório ainda sem suporte a filtros)
- [ ] Adicionar testes de regressão para `GET /api/events` sem filtros (backward compat)

### Testes a implementar primeiro
- [ ] Teste unitário: `ListPublishedEventsUseCase` — filtros `q`, `category`, `date` e presença de `nextCursor`
- [ ] Teste unitário: `GetEventAnalyticsUseCase` — cálculo de receita, ocupação por lote e redemptions de cupom
- [ ] Teste de integração: `GET /api/events?q=festival&category=shows` retorna subset correto
- [ ] Teste de integração: cursor pagination retorna `nextCursor` na primeira página e `null` na última
- [ ] Teste de autorização: `GET /api/events/:slug/analytics` retorna `403` para `customer`
- [ ] Teste de regressão: `GET /api/events` sem params continua funcionando como antes

### Evidência RED
- **Comando executado:** `npm run test:unit -- --testPathPattern="list-published-events|get-event-analytics"`
- **Falha esperada observada:** testes falham porque use-cases não aceitam filtros e analytics use-case não existe
- **Observações:** confirmar que erro é "filtro não suportado" ou "use-case não encontrado", não erro de sintaxe

---

## 9. Etapa 4 — Implementação

### Objetivo
Implementar o mínimo necessário para os testes passarem, na ordem do caminho crítico, preservando backward compatibility.

### Checklist
- [ ] Adicionar campo `category varchar(100) nullable` na tabela `events` e gerar migration
- [ ] Criar migration com índices GIN em `events.title` e `events.location`
- [ ] Atualizar `EventRepository.listPublished()` com cursor pagination e WHERE conditions para filtros
- [ ] Atualizar `ListPublishedEventsUseCase` para aceitar e repassar filtros e cursor
- [ ] Atualizar `GET /api/events` com validação Zod dos query params e resposta com `nextCursor`
- [ ] Implementar `EventRepository.getAnalytics(eventId)` com JOINs agregados
- [ ] Implementar `GetEventAnalyticsUseCase` com ownership check
- [ ] Criar `GET /api/events/:slug/analytics` com auth organizer/admin
- [ ] Implementar search bar com debounce 300ms e URL state sync na home
- [ ] Implementar filtros de data, localização e categoria na home
- [ ] Implementar infinite scroll / "Carregar mais" com cursor pagination
- [ ] Implementar painel "Métricas" no admin com KPI cards e tabela de lotes

### Regras obrigatórias
- Não confiar em input do client para calcular receita — todos os totais derivados server-side
- Auth e ownership check do evento para analytics no handler
- Nenhuma implementação sem teste correspondente
- Migration `category` deve ser nullable para backward compatibility zero downtime
- Filtros na UI apenas como camada de apresentação; regras de filtragem ficam no use-case/repositório

### Mudanças previstas
- **Backend:** `ListPublishedEventsUseCase`, `GetEventAnalyticsUseCase` (novo), `EventRepository` (dois novos métodos)
- **API:** `GET /api/events` (query params + cursor), `GET /api/events/:slug/analytics` (novo)
- **Frontend:** `src/app/page.tsx`, `src/features/events/event-search.tsx`, `src/app/admin/page.tsx`, `src/features/admin/analytics-panel.tsx`
- **Banco/Schema:** coluna `category` em `events`, índices GIN em `title` e `location`
- **Infra/Config:** `npm run db:push` para aplicar migration da coluna `category`
- **Docs:** atualizar contrato da API de eventos na documentação técnica

---

## 10. Etapa 5 — Refatoração

### Objetivo
Garantir clareza nas responsabilidades entre use-case, repositório e handler após os testes passarem.

### Checklist
- [ ] Extrair builder de filtros de query para função auxiliar no repositório se necessário
- [ ] Garantir que o use-case de analytics não contenha lógica de query diretamente
- [ ] Remover duplicações entre filtros de Discovery no repositório
- [ ] Garantir que todos os testes continuem verdes após refatoração
- [ ] Verificar nomenclatura de tipos e interfaces de cursor pagination

### Saída esperada
- Lógica de filtragem encapsulada no repositório, não vazando para o use-case
- Use-case de analytics com responsabilidade de orquestração e verificação de ownership apenas
- Sem regressão nos testes de Discovery e Analytics

---

## 11. Etapa 6 — Validação, QA e Rollout

### Testes obrigatórios finais
- [ ] Executar `npm run test:unit` — testes de use-cases e repositórios
- [ ] Executar `npm run test:integration` — endpoints com filtros e auth
- [ ] Executar `npm run lint:architecture` — verificar que analytics endpoint não viola boundary de camadas
- [ ] Executar `npm run build` — verificar que não há erros de TypeScript
- [ ] Executar `npm run db:push` — confirmar migration aplicada sem erros
- [ ] Validar fluxo manual: busca + filtros na home, painel de métricas no admin

### Comandos finais
```bash
npm run test:unit
npm run test:integration
npm run lint:architecture
npm run build
npm run db:push
```

### Rollout
- **Estratégia de deploy:** migration `category` é nullable — backward compatible, zero downtime; deploy normal sem feature flag
- **Uso de feature flag:** não necessário — adição de coluna nullable e novos endpoints não quebram clientes existentes
- **Plano de monitoramento pós-release:** verificar logs de query para índices GIN sendo usados; monitorar tempo de resposta do endpoint de analytics
- **Métricas a observar:** latência de `GET /api/events` com filtros, latência de `GET /api/events/:slug/analytics`
- **Alertas esperados:** nenhum — deploy backward compatible

### Responsáveis
- **Backend:** @jeandias
- **Frontend:** @jeandias
- **QA:** @jeandias
- **Produto:** @jeandias
- **Release/Deploy:** @jeandias

### Janela de deploy
- **Horário recomendado:** qualquer horário — zero downtime migration
- **Tempo de monitoramento:** 15 minutos após deploy

---

## 12. Checkpoints do Agent OS

- [ ] Checkpoint 1 — Discovery validado: schema mapeado, estratégia de cursor e analytics definidos
- [ ] Checkpoint 2 — Estratégia de testes aprovada: contratos de resposta definidos, matriz de testes revisada
- [ ] Checkpoint 3 — RED tests concluídos: testes falhando pelo motivo correto
- [ ] Checkpoint 4 — GREEN alcançado: backend discovery e analytics funcionais com testes passando
- [ ] Checkpoint 5 — Refatoração concluída: sem duplicações, responsabilidades claras
- [ ] Checkpoint 6 — Validação final concluída: build, lint, integração e homologação manual passando

### Log resumido dos checkpoints
| Checkpoint | Responsável | Resultado | Observações |
|-----------|-------------|-----------|-------------|
| 1 — Discovery | @jeandias | ⏳ Pendente | |
| 2 — Estratégia de testes | @jeandias | ⏳ Pendente | |
| 3 — RED tests | @jeandias | ⏳ Pendente | |
| 4 — GREEN | @jeandias | ⏳ Pendente | |
| 5 — Refatoração | @jeandias | ⏳ Pendente | |
| 6 — Validação final | @jeandias | ⏳ Pendente | |

---

## 13. Checklist de Homologação

| Cenário | Resultado esperado | Evidência | Status |
| ------- | ------------------ | --------- | ------ |
| Comprador pesquisa "festival" na home | Resultados filtrados aparecem em < 500ms | Response time log | ⬜ |
| Comprador filtra por data + categoria | Listagem atualiza com resultados corretos | Screenshot / response body | ⬜ |
| Comprador chega ao fim da listagem | "Carregar mais" some ou desativa quando `nextCursor = null` | Screenshot / network log | ⬜ |
| Organizer acessa aba "Métricas" no admin | Vê receita total, tickets vendidos e % ocupação por lote | Screenshot do painel | ⬜ |
| Customer tenta acessar analytics de evento | Recebe 403 | Response body `{ error: { code: "forbidden" } }` | ⬜ |
| Evento com todos os lotes esgotados | Ocupação mostra 100% em todos os lotes | Response body de analytics | ⬜ |

---

## 14. Plano de Rollback

### Gatilhos
- Query de analytics com impacto crítico de performance em produção
- Regressão no fluxo de listagem de eventos (endpoint retornando erro 500)
- Cursor pagination com comportamento incorreto (dados duplicados ou ausentes)
- Aumento anormal de erros no endpoint `GET /api/events`

### Passos
1. Suspender acesso ao endpoint de analytics via variável de ambiente ou remoção temporária da rota
2. Reverter migration de `category` via `db:rollback` se necessário (coluna nullable — impacto zero)
3. Executar smoke tests após reversão: `GET /api/events` sem filtros, fluxo de compra
4. Comunicar incidente e registrar causa provável no Changelog
5. Abrir task de pós-mortem para investigar query de analytics se for caso de performance

### Responsáveis
- **Execução técnica:** @jeandias
- **Revalidação:** @jeandias
- **Comunicação:** @jeandias

### RTO
- Até 15 minutos (reverter migration nullable é operação de baixo risco)

---

## 15. Critérios de Aceite

- [ ] Todos os cenários críticos cobertos por testes antes da implementação
- [ ] Os testes foram escritos antes da implementação (TDD)
- [ ] Endpoint `GET /api/events` com filtros e cursor pagination funcionando
- [ ] Endpoint `GET /api/events/:slug/analytics` com auth, ownership e dados corretos
- [ ] Frontend com search bar, filtros e infinite scroll integrados ao backend
- [ ] Painel de métricas no admin exibindo KPIs corretos
- [ ] Não houve regressão no fluxo de listagem e compra de eventos
- [ ] Regras de ownership e auth protegidas no backend, não no frontend
- [ ] Checklist de homologação executado
- [ ] Rollback definido e documentado
- [ ] Critérios de sucesso da sprint foram atingidos

---

## 16. Definition of Done

A sprint só pode ser considerada concluída quando:

- [ ] Escopo acordado entregue: Discovery, Analytics e frontends correspondentes
- [ ] Critérios de aceite atendidos
- [ ] Testes unitários e de integração passando
- [ ] Migration aplicada e versionada
- [ ] Sem violação arquitetural crítica (auth/ownership no backend, regras no use-case)
- [ ] Sem blocker aberto
- [ ] Documentação técnica do contrato de API atualizada

---

## 17. Instrução padrão para AGENTS.md

```text
When generating new sprints for this application, always follow the official Sprint Template.

This application is TDD-first and Agent-OS-driven.

Mandatory rules:
- tests come before implementation
- every feature, fix, or refactor must define expected behavior first
- every implementation must have corresponding automated tests
- regression fixes must include regression tests
- backend validation and data integrity must be prioritized
- do not generate implementation-only sprints
- every sprint must include discovery, behavior design, test strategy, test-first execution, implementation, refactor, QA, validation, and rollback
- when useful, split work into parallelizable execution batches
- preserve the current architecture and codebase conventions
- do not generate generic sprint content

Always keep the sprint specific to the current codebase and architecture.
Follow the sprint template exactly.
```
