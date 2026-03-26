# TicketFlow Roadmap

> Última atualização: 2026-03-26
> Baseado em: [`AGENTS.md`](../../AGENTS.md)

## Objetivo

Evoluir o demo full-stack atual para uma base de produto pronta para migração futura para `Next.js + NestJS`, preservando domínio e casos de uso.

## Princípios de Execução

- Arquitetura em camadas com fronteiras claras.
- Regras de negócio no domínio/aplicação.
- Persistência isolada em repositórios.
- TDD obrigatório para mudanças de comportamento.
- Segurança e autorização server-side como padrão.

## Fases

### Fase 0 - Foundation (Status: Done)

**Objetivo:** consolidar estrutura, convenções e documentação base.

**Entregas:**
- Estrutura inicial de `docs/development`.
- Definições de padrão arquitetural e workflow.
- Base para acompanhamento de tarefas e mudanças.

**Saída esperada:**
- Time operando com padrão único para novas entregas.

### Fase 1 - Core Domain Modeling (Status: In Progress)

**Objetivo:** formalizar entidades e regras centrais de eventos, lotes, pedidos, tickets e cupons.

**Entregas:**
- Tipos e invariantes de domínio.
- Contratos de repositório por agregado.
- Schemas Zod para entradas críticas.

**Saída esperada:**
- Núcleo de regras desacoplado do framework.

### Fase 2 - Purchase Flow MVP (Status: Planned)

**Objetivo:** implementar fluxo de compra ponta a ponta com cálculo e validações server-side.

**Entregas:**
- Use-case `createOrder` com validação de estoque e preço.
- Criação de itens de pedido e tickets válidos.
- Tratamento de erros estruturados no handler.

**Saída esperada:**
- Fluxo de compra com consistência transacional e testes.

### Fase 3 - Organizer/Admin Operations (Status: Planned)

**Objetivo:** habilitar gestão de eventos com RBAC por papel.

**Entregas:**
- Casos de uso para publicar/editar evento.
- Regras de autorização por `organizer` e `admin`.
- Visões operacionais para gestão de eventos e vendas.

**Saída esperada:**
- Operação administrativa sem violar limites de ownership.

### Fase 4 - Check-in and Ticket Integrity (Status: Planned)

**Objetivo:** garantir validação de ingressos no check-in sem reuso indevido.

**Entregas:**
- Use-case de validação de check-in.
- Bloqueio de ticket usado/cancelado.
- Validação de contexto de evento para o ticket.

**Saída esperada:**
- Processo de entrada com antifraude básico.

### Fase 5 - Hardening (Status: Planned)

**Objetivo:** elevar confiabilidade, segurança e performance para cenário próximo de produção.

**Entregas:**
- Cobertura de testes nos fluxos prioritários.
- Revisão de erros, observabilidade e logs.
- Revisão de queries (evitar N+1) e payloads.

**Saída esperada:**
- Plataforma estável para demonstração avançada.

### Fase 6 - Migration Readiness (Status: Planned)

**Objetivo:** reduzir risco de migração para `Next.js + NestJS`.

**Entregas:**
- Auditoria de acoplamentos ao runtime atual.
- Extração de módulos portáveis de aplicação/domínio.
- Plano técnico de migração por etapas.

**Saída esperada:**
- Caminho de migração com baixo retrabalho.

## Backlog Prioritário Imediato

1. Implementar e testar `createOrder` com cálculo server-side.
2. Implementar validação de estoque/lotes com janela de venda.
3. Implementar aplicação de cupom com limites e validade.
4. Implementar geração e validação de tickets/check-in.
5. Consolidar autorização RBAC por papel e ownership.

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

## Plano de Sprints Iniciais (TDD-first)

1. Sprint 001: Foundation Architecture + TDD Tooling.
2. Sprint 002: Core Domain + Schema + Repositories.
3. Sprint 003: Create Order Flow (Server-First).
4. Sprint 004: Ticket Validation + Check-in + RBAC.
5. Sprint 005: Organizer/Admin Operations + Event Publication.
