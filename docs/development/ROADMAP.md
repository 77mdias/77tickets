# TicketFlow Roadmap

> Última atualização: 2026-04-01
> Baseado em: [`AGENTS.md`](../../AGENTS.md)

## Objetivo

Evoluir o demo full-stack atual para uma base de produto pronta para migração futura para `Next.js + NestJS`, preservando domínio e casos de uso.

## Princípios de Execução

- Arquitetura em camadas com fronteiras claras.
- Regras de negócio no domínio/aplicação.
- Persistência isolada em repositórios.
- TDD obrigatório para mudanças de comportamento.
- Segurança e autorização server-side como padrão.

## Atualização Operacional (2026-03-29)

- Fase 004 (`Ticket Validation + Check-in + RBAC`) concluída com QA/documentação da `SEC-003`.
- Fase 005 (`Organizer/Admin Operations + Event Publication`) encerrada formalmente com `GOV-003` e handoff documental.
- Próximo foco operacional: `Hardening` (prioridade alta) seguido de `Migration Readiness` (prioridade média).

## Fases

### Fase 0 - Foundation (Status: Done)

**Objetivo:** consolidar estrutura, convenções e documentação base.

**Entregas:**
- Estrutura inicial de `docs/development`.
- Definições de padrão arquitetural e workflow.
- Base para acompanhamento de tarefas e mudanças.

**Saída esperada:**
- Time operando com padrão único para novas entregas.

### Fase 1 - Core Domain Modeling (Status: Done)

**Objetivo:** formalizar entidades e regras centrais de eventos, lotes, pedidos, tickets e cupons.

**Entregas:**
- Tipos e invariantes de domínio.
- Contratos de repositório por agregado.
- Schemas Zod para entradas críticas.

**Saída esperada:**
- Núcleo de regras desacoplado do framework.

### Fase 2 - Purchase Flow MVP (Status: Done)

**Objetivo:** implementar fluxo de compra ponta a ponta com cálculo e validações server-side.

**Entregas:**
- Use-case `createOrder` com validação de estoque e preço.
- Criação de itens de pedido e tickets válidos.
- Tratamento de erros estruturados no handler.

**Saída esperada:**
- Fluxo de compra com consistência transacional e testes.

### Fase 3 - Organizer/Admin Operations (Status: Done)

**Objetivo:** habilitar gestão de eventos com RBAC por papel.

**Entregas:**
- Casos de uso para publicar/editar evento.
- Regras de autorização por `organizer` e `admin`.
- Visões operacionais para gestão de eventos e vendas.

**Saída esperada:**
- Operação administrativa sem violar limites de ownership.

### Fase 4 - Check-in and Ticket Integrity (Status: Done)

**Objetivo:** garantir validação de ingressos no check-in sem reuso indevido.

**Entregas:**
- Use-case de validação de check-in.
- Bloqueio de ticket usado/cancelado.
- Validação de contexto de evento para o ticket.

**Saída esperada:**
- Processo de entrada com antifraude básico.

### Fase 5 - Auth Integration & Schema Completion (Status: Next - High Priority)

> Equivalente ao Sprint 006.

**Objetivo:** fechar o gap de identidade de usuário, integrar auth real e completar schema com campos faltantes.

**Entregas:**
- Tabela `users` com FKs em `orders` e `events`.
- Campos de apresentação (`description`, `location`, `imageUrl`) em `events`.
- Better Auth integrado com adapter Drizzle.
- Session middleware em todos os handlers.
- Testes de integração de auth e regressão de RBAC.

**Saída esperada:**
- Usuário consegue registrar, logar e operar a aplicação com identidade real.

### Fase 6 - Public Customer Experience (Status: Planned - High Priority)

> Equivalente ao Sprint 007.

**Objetivo:** implementar todos os fluxos do comprador com endpoints GET públicos e "Meus Ingressos".

**Entregas:**
- `listPublished()` no `EventRepository` + endpoint `GET /api/events`.
- Endpoint `GET /api/events/:slug` com evento + lotes ativos.
- `listByCustomerId()` em `TicketRepository` e `OrderRepository`.
- Endpoint `GET /api/orders/mine` com tokens de ticket.
- Geração de QR code visual para ticket.
- Páginas: listagem de eventos, detalhe, "Meus Ingressos", checkout conectado.

**Saída esperada:**
- Demo end-to-end funcional para o fluxo do comprador.

### Fase 7 - Admin Dashboard Completeness (Status: Planned - Medium-High Priority)

> Equivalente ao Sprint 008.

**Objetivo:** completar o painel admin/organizer com criação de evento, CRUD de lotes e visão de pedidos.

**Entregas:**
- Use-case `createEvent` + endpoint `POST /api/events`.
- `LotRepository.save()` + use-cases `createLot` e `updateLot` + endpoints.
- `OrderRepository.listByEventId()` + use-case `listEventOrders` + endpoint.
- UI admin: criar evento, criar lotes, ver pedidos.

**Saída esperada:**
- Organizer consegue criar e gerenciar eventos ponta a ponta.

### Fase 8 - Hardening (Status: Planned - Medium Priority)

> Equivalente ao Sprint 009. Corresponde à Fase 5 original do ROADMAP.

**Objetivo:** elevar confiabilidade, segurança e performance para cenário próximo de produção.

**Entregas:**
- Gate de regressão automatizado para fluxos críticos.
- Audit trail para order.created, checkin.validated, event.published.
- Shape de erro padronizado em todos os handlers.
- N+1 eliminado nos principais endpoints.
- Rate limiting básico nos endpoints de escrita.
- 3 runbooks operacionais.

**Saída esperada:**
- Plataforma estável para demonstração avançada.

### Fase 9 - Migration Readiness (Status: Planned - Medium Priority)

> Equivalente ao Sprint 010. Corresponde à Fase 6 original do ROADMAP.

**Objetivo:** reduzir risco de migração para `Next.js + NestJS`.

**Entregas:**
- Inventário de acoplamentos ao Vinext e Cloudflare Workers.
- domain e application layers confirmados portáveis empiricamente.
- `MIGRATION-PLAN.md` com plano incremental e marcos.
- Guardrails ESLint expandidos para novos acoplamentos detectados.

**Saída esperada:**
- Caminho de migração com baixo retrabalho documentado e validado.

## Backlog Prioritário (Pós-Fase 005 — Atualizado 2026-03-29)

> Backlog revisado após review completa do gap PRD vs. código. Novas fases adicionadas.

1. **[Alta — Bloqueante]** Integrar auth real + criar tabela `users` com FKs → Fase 5 (Sprint 006).
2. **[Alta — Demo incompleto]** Implementar fluxo do comprador (listagem, detalhe, meus ingressos, QR) → Fase 6 (Sprint 007).
3. **[Média-Alta]** Completar admin: criar evento, criar lotes, ver pedidos → Fase 7 (Sprint 008).
4. **[Média]** Expandir gate de regressões, audit trail, N+1 e runbooks → Fase 8 (Sprint 009).
5. **[Média]** Auditar acoplamentos e documentar plano de migração NestJS → Fase 9 (Sprint 010).

### Gaps Críticos Identificados na Review (2026-03-29)

| Gap | Severidade | Sprint |
|-----|-----------|--------|
| Tabela `users` ausente — FKs sem enforcement | Alta | 006 |
| Auth mockada nos handlers — inviável para produção | Alta | 006 |
| Nenhum endpoint GET público — comprador sem navegação | Alta | 007 |
| `listPublished()` ausente no EventRepository | Alta | 007 |
| "Meus Ingressos" sem implementação | Alta | 007 |
| QR code sem geração visual | Alta | 007 |
| `createEvent` use-case ausente | Média-Alta | 008 |
| `LotRepository` sem operações de escrita | Média-Alta | 008 |
| `OrderRepository` sem `listByEventId()` | Média-Alta | 008 |
| Schema de eventos sem campos de apresentação | Média | 006 |

## Riscos e Prioridades (Próximas Fases)

- **Risco alto:** regressões silenciosas em regras de autorização e transições de status.
- **Risco alto:** baixa visibilidade operacional em erros de produção sem trilha de auditoria padronizada.
- **Risco médio:** retrabalho na migração para `Next.js + NestJS` se novos acoplamentos de framework forem introduzidos.

## Dependências Técnicas Estratégicas

- Banco: Neon PostgreSQL.
- ORM: Drizzle ORM com migrations explícitas.
- Validação: Zod em toda fronteira de entrada.
- Runtime alvo de demo: Cloudflare Workers.

## Critérios de Evolução de Fase

- Entregas da fase implementadas com testes relevantes passando.
- Documentação de tarefas atualizada.
- Changelog atualizado no bloco `[Unreleased]`.
- Nenhuma quebra de fronteira arquitetural documentada como dívida oculta.

## Plano de Sprints (TDD-first)

### Sprints Concluídas
1. Sprint 001: Foundation Architecture + TDD Tooling. ✅
2. Sprint 002: Core Domain + Schema + Repositories. ✅
3. Sprint 003: Create Order Flow (Server-First). ✅
4. Sprint 004: Ticket Validation + Check-in + RBAC. ✅
5. Sprint 005: Organizer/Admin Operations + Event Publication. ✅
6. Sprint 006: Auth Integration & Schema Completion. ✅
7. Sprint 007: Public Customer Experience. ✅
8. Sprint 008: Admin Dashboard Completeness. ✅
9. Sprint 009: Hardening. ✅
10. Sprint 010: Migration Readiness. ✅
11. Sprint 011: CI Foundation + Supply Chain Security. ✅
12. Sprint 012: Runtime/API Security Hardening. ✅
13. Sprint 013: CD Cloudflare + Release Security. ✅
