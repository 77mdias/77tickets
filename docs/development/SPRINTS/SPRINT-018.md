---
title: Sprint 018 — NestJS Backend Extraction
type: sprint
mode: sprint
approach: tdd-first
status: planned
---

# Sprint 018 — NestJS Backend Extraction

> **ENTRY CONDITION:** Esta sprint não pode ser iniciada sem o arquivo `MIGRATION-GATE.md` com o item `[x] Aprovado` marcado. A aprovação do gate da Sprint 017 é pré-requisito não negociável.

## 1. Objetivo

Extrair o backend como serviço NestJS independente em `packages/backend/`, portando domain e application sem nenhuma alteração de lógica de negócio, mapeando todos os endpoints existentes em NestJS Controllers com Guards, e viabilizando deploy autônomo no Render — inaugurando a Fase 1 da migração incremental documentada em `docs/development/MIGRATION-PLAN.md`. O frontend permanece em Vinext/Cloudflare Workers; a integração com o novo backend ocorre na Sprint 019.

---

## 2. Resumo Executivo

- **Tipo da sprint:** migração
- **Modo principal do Agent OS:** backend
- **Fase relacionada:** Fase 018 — NestJS Backend Extraction
- **Status:** 🟢 Planejada
- **Prioridade:** 🔴 Crítica
- **Owner principal:** @jeandias
- **Dependências externas:** Sprint 017 gate aprovado ✅ (MIGRATION-GATE.md com `[x] Aprovado`)
- **Janela estimada:** 2.5 semanas

---

## 3. Contexto

- **Problema atual:** O projeto opera como monolito Vinext + Cloudflare Workers (demo). O runtime atual acopla entrega HTTP, autenticação, e infraestrutura em adaptadores proprietários do Vinext. A Fase 1 da migração requer separar o backend em um serviço NestJS portável e deployável de forma independente.
- **Impacto no sistema/produto:** Separação backend/frontend com deploy independente; adoção do padrão de DI nativo do NestJS; eliminação da dependência de Vinext/Cloudflare Workers no backend; base para a integração Vinext → NestJS da Sprint 019. O frontend permanece em Vinext/Cloudflare Workers indefinidamente.
- **Riscos envolvidos:** Regressão de endpoints se o mapeamento de Controllers divergir dos contratos existentes. Acoplamento residual de imports Vinext/Cloudflare no domain/application detectado apenas no `tsc --noEmit` isolado. Raw body parser do NestJS conflitando com validação de assinatura Stripe no `WebhooksController`.
- **Áreas afetadas:** `packages/backend/` (novo workspace), `packages/domain/` (novo — cópia portada do domain existente), `src/server/domain/`, `src/server/application/`, `src/server/repositories/`, `src/server/payment/`, `src/server/email/`
- **Fluxos de usuário impactados:** Todos os endpoints públicos e autenticados — eventos, lotes, pedidos, check-in, cupons, webhooks Stripe, cron de lembretes.
- **Premissas importantes:** Domain e application foram validados como framework-agnostic na Sprint 017. O gate de portabilidade (`tsc --noEmit` sem dependências de Vinext) foi aprovado antes de iniciar esta sprint. A extração não altera nenhum business logic — apenas muda a camada de entrega.
- **Fora de escopo nesta sprint:** Integração Vinext → NestJS (Sprint 019), GraphQL, WebSockets, multi-tenant, autenticação OAuth providers novos, migração de banco de dados. O frontend Vinext/Cloudflare Workers nunca é migrado.

---

## 4. Critérios de Sucesso

- [ ] `packages/backend/` com NestJS bootstrapped rodando independente na porta 3001 (configurável via env `PORT`)
- [ ] Domain + application copiados para `packages/backend/src/` passando `tsc --noEmit` sem nenhuma dependency de Vinext ou Cloudflare Workers
- [ ] Todos os endpoints mapeados em NestJS Controllers: events, lots, orders, checkin, coupons, webhooks, analytics, cron
- [ ] RBAC implementado via NestJS Guards: `SessionGuard`, `RolesGuard`, `OwnershipGuard`
- [ ] Repositórios Drizzle injetados via NestJS DI module providers no `DatabaseModule`
- [ ] `EmailModule` e `PaymentModule` como NestJS providers injetáveis nos use-cases
- [ ] Todos os integration tests passando contra NestJS backend (não mais Vinext) — 18 arquivos, 514 testes
- [ ] Deploy funcionando: `render.yaml` configurado com healthCheckPath, buildCommand e startCommand

---

## 5. Dependências e Sequenciamento

### Dependências de entrada
- [ ] `MIGRATION-GATE.md` aprovado com `[x] Aprovado` — Sprint 017 gate validado
- [ ] Domain e application confirmados framework-agnostic via `tsc --noEmit` isolado (resultado do gate Sprint 017)
- [ ] Contratos de repositório em `src/server/repositories/*.contracts.ts` definidos e estáveis
- [ ] `EmailProvider` e `PaymentProvider` com contratos portáveis (Sprints 015 e 014 concluídas)
- [ ] Ambiente Render ou Render disponível para configuração do deploy

### Ordem macro recomendada
1. Discovery — mapear todos os endpoints e contratos de entrega existentes no Vinext
2. Setup monorepo e NestJS bootstrapping (NEST-001, NEST-002)
3. Port de domain + application e validação isolada (NEST-003, NEST-004)
4. Providers de use-cases via DI (NEST-005) e módulos de infraestrutura (NEST-016, NEST-017, NEST-018)
5. Guards de autenticação e autorização (NEST-013, NEST-014, NEST-015)
6. Controllers por domínio vertical (NEST-006 a NEST-012)
7. Adaptação da suíte de integration tests (NEST-019)
8. Configuração de deploy (NEST-020) e validação final

### Paralelização possível
- NEST-007, NEST-008, NEST-009, NEST-010, NEST-011, NEST-012 (controllers) podem avançar em paralelo após NEST-005
- NEST-016, NEST-017, NEST-018 (módulos de infraestrutura) podem avançar em paralelo após NEST-003
- NEST-014 e NEST-015 podem avançar em paralelo com NEST-013 após NEST-002

### Caminho crítico
- NEST-001 → NEST-002 → NEST-003 → NEST-004 → NEST-005 → NEST-013 → NEST-006 → NEST-019

---

## 6. Etapa 1 — Discovery Técnico

### Objetivo
Mapear todos os handlers Vinext existentes, contratos de endpoint, e adapters de autenticação/autorização para garantir que os NestJS Controllers produzirão paridade exata de comportamento.

### Checklist
- [ ] Listar todos os route handlers em `src/server/api/` e mapear para método HTTP, path, roles permitidas e use-case chamado
- [ ] Verificar contratos de resposta de erro em `mapAppErrorToResponse` (equivalente ao `ExceptionFilter` no NestJS)
- [ ] Identificar onde sessão/role são derivadas nos handlers Vinext (equivalente ao `SessionGuard`)
- [ ] Verificar raw body parser para Stripe webhook no runtime Vinext atual — confirmar que NestJS precisa de configuração equivalente
- [ ] Confirmar que `PaymentProvider`, `EmailProvider` e contratos de repositório existem como interfaces separadas das implementações
- [ ] Mapear todos os use-cases que precisam de provider injetado (email, payment, repositories)
- [ ] Confirmar quantidade e escopo dos 18 arquivos de integration tests que precisam ser adaptados
- [ ] Levantar edge cases: cron endpoint com `CRON_SECRET`, ownership de eventos para organizer, checker sem acesso a organizer endpoints

### Saída esperada
- Tabela completa de endpoints: método, path, guard, use-case, status code de sucesso
- Contratos de DI token para todos os repositórios, use-cases e providers
- Identificação de riscos de paridade entre Vinext handlers e NestJS Controllers
- Plano de configuração de raw body parser para Stripe webhook

---

## 7. Etapa 2 — Design de Comportamento e Estratégia de Testes

### Objetivo
Definir comportamento verificável para cada Controller e Guard antes de qualquer implementação, garantindo que os testes de integração capturem paridade exata com os handlers Vinext.

### Checklist
- [ ] Definir shape de resposta de sucesso e erro para cada Controller (compatível com contratos existentes)
- [ ] Definir critérios de aceite testáveis para `SessionGuard` (401 sem sessão, 403 com role insuficiente)
- [ ] Definir critérios de aceite para `RolesGuard` por endpoint (customer, organizer, admin, checker)
- [ ] Definir critérios de aceite para `OwnershipGuard` (organizer tentando acessar evento de outro organizer → 403)
- [ ] Listar cenários de parity test: mesma requisição produz mesmo body e status code em Vinext e NestJS
- [ ] Confirmar que `ValidationPipe` global cobre todos os casos de entrada inválida com 400 bem estruturado
- [ ] Confirmar que `ClassSerializerInterceptor` não vaza campos internos nas respostas

### Casos de teste planejados
- [ ] Cenário 1: `GET /api/events` no NestJS retorna mesma lista que no Vinext (parity test)
- [ ] Cenário 2: `POST /api/orders` com auth customer cria pedido corretamente e retorna `checkoutUrl`
- [ ] Cenário 3: `POST /api/checkin` com auth checker valida ticket e retorna status de entrada
- [ ] Cenário 4: `SessionGuard` rejeita request sem sessão válida com HTTP 401
- [ ] Cenário 5: `RolesGuard` bloqueia customer tentando acessar endpoint de organizer com HTTP 403
- [ ] Cenário 6: `OwnershipGuard` bloqueia organizer tentando publicar evento de outro organizer com HTTP 403
- [ ] Edge case 1: `POST /api/webhooks/stripe` sem assinatura HMAC válida retorna HTTP 400 sem processar evento
- [ ] Regressão 1: Todos os 18 arquivos de integration tests passam 100% contra NestJS

### Matriz de testes
| Tipo | Escopo | Obrigatório? | Observações |
|------|--------|--------------|-------------|
| Integração | Todos os Controllers — paridade Vinext vs NestJS | Sim | 18 arquivos, 514 testes adaptados |
| Unitário | `SessionGuard`, `RolesGuard`, `OwnershipGuard` | Sim | Mocks de sessão e user roles |
| Auth/AuthZ | Endpoints com restrição de role e ownership | Sim | Cada guard validado isoladamente |
| Smoke | NestJS sobe e responde `/api/events` no Render | Sim | Validação pós-deploy |
| Regressão | Todos os fluxos críticos (checkout, checkin, coupons) | Sim | Parity test completo |

---

## 8. Etapa 3 — Testes Primeiro (TDD)

### Objetivo
Criar testes RED de integração que falhem por ausência do NestJS backend antes de implementar qualquer Controller, Guard ou módulo de infraestrutura.

### Checklist
- [ ] Adaptar 18 arquivos de integration tests para apontar para HTTP client NestJS (porta 3001) em vez de route handlers Vinext
- [ ] Garantir que os testes adaptados falhem por `ECONNREFUSED` ou `404` antes de qualquer implementação
- [ ] Escrever teste unitário para `SessionGuard` — rejeitando request sem sessão antes de implementar o guard
- [ ] Escrever teste unitário para `RolesGuard` — rejeitando role insuficiente antes de implementar o guard
- [ ] Escrever teste unitário para `OwnershipGuard` — rejeitando ownership inválido antes de implementar o guard
- [ ] Garantir que testes de webhook Stripe falhem com 404 antes de `WebhooksController` existir
- [ ] Confirmar que os RED tests falham pelo motivo correto — ausência de módulo, não erro de sintaxe nos testes

### Testes a implementar primeiro
- [ ] Teste de integração: `GET /api/events` no NestJS retorna HTTP 200 com lista de eventos
- [ ] Teste de integração: `POST /api/orders` com sessão customer cria pedido com `status: 'pending'`
- [ ] Teste de integração: `POST /api/checkin` com sessão checker valida ticket ativo
- [ ] Teste unitário: `SessionGuard` retorna 401 quando `getSession()` retorna null
- [ ] Teste unitário: `RolesGuard` retorna 403 quando `request.user.role` não está em `@Roles(...)`
- [ ] Teste unitário: `OwnershipGuard` retorna 403 quando `event.organizerId !== request.user.id`
- [ ] Teste de contrato/API: `POST /api/webhooks/stripe` sem header `stripe-signature` retorna HTTP 400

### Evidência RED
- **Comando executado:** `cd packages/backend && npm run test:integration`
- **Falha esperada observada:** `connect ECONNREFUSED 127.0.0.1:3001` — servidor NestJS ainda não existe
- **Observações:** Testes de unit dos guards devem falhar com `Cannot find module` antes dos arquivos de guard serem criados

---

## 9. Etapa 4 — Implementação

### Objetivo
Implementar o mínimo necessário para fazer os testes passarem respeitando a ordem do caminho crítico: monorepo → bootstrap → port de domain → DI → guards → controllers → integration tests verdes.

### Checklist
- [ ] NEST-001: Configurar monorepo com `workspaces: ["packages/*"]` no `package.json` raiz e estrutura de `packages/backend/`
- [ ] NEST-002: Bootstrapping NestJS com `AppModule`, `main.ts`, CORS, Helmet, `ValidationPipe` global, `ClassSerializerInterceptor`
- [ ] NEST-003: Copiar `src/server/domain` e `src/server/application` para `packages/backend/src/` sem alterar business logic
- [ ] NEST-004: Validar `tsc --noEmit` em `packages/backend/` — confirmar zero imports de Vinext ou Cloudflare
- [ ] NEST-005: Criar `ApplicationModule` com todos os 14 use-cases registrados como `@Injectable()` providers via factory tokens
- [ ] NEST-016: `DatabaseModule` com DrizzleORM e todos os repositórios Drizzle como providers por token de contrato
- [ ] NEST-017: `EmailModule` com `ResendEmailProvider` como provider injetável
- [ ] NEST-018: `PaymentModule` com `StripePaymentProvider` como provider injetável
- [ ] NEST-013: `SessionGuard` validando sessão Better Auth via `getSession()` e injetando `request.user`
- [ ] NEST-014: `RolesGuard` validando role do `request.user` contra `@Roles(...)` decorator
- [ ] NEST-015: `OwnershipGuard` validando que evento pertence ao organizer logado
- [ ] NEST-006: `EventsController` com todos os 7 endpoints de eventos
- [ ] NEST-007: `LotsController` com endpoints de lotes (GET, POST, PUT)
- [ ] NEST-008: `OrdersController` com endpoints de pedidos (POST, GET mine, POST simulate-payment)
- [ ] NEST-009: `CheckinController` com endpoint de check-in (`POST /checkin`)
- [ ] NEST-010: `CouponsController` com endpoints de cupons (create, update)
- [ ] NEST-011: `WebhooksController` com raw body parser para Stripe HMAC validation
- [ ] NEST-012: `CronController` com endpoint de lembretes protegido por `CRON_SECRET`
- [ ] NEST-019: Adaptar 18 arquivos de integration tests para HTTP client apontando para NestJS
- [ ] NEST-020: Configurar `render.yaml` com buildCommand, startCommand e healthCheckPath

### Regras obrigatórias
- Domain e application em `packages/backend/src/` não recebem nenhum decorator NestJS — permanecem framework-agnostic
- Nenhum import de `@nestjs/*` em `packages/backend/src/domain/` ou `packages/backend/src/application/`
- Controllers permanecem finos — sem regra de negócio inline; apenas delegar para use-cases via DI
- `SessionGuard` e `RolesGuard` aplicados via decorators — nunca inline nos métodos de controller
- Raw body obrigatório em `WebhooksController` para validação HMAC Stripe — configurado via `bodyParser: false` na rota específica
- `OwnershipGuard` deriva ownership server-side — nunca confia em `organizerId` do body
- Toda correction de paridade deve ser acompanhada de teste de regressão equivalente

### Mudanças previstas
- **Backend:** `packages/backend/` (novo workspace completo com NestJS)
- **API:** Todos os endpoints existentes replicados com contratos idênticos de request/response
- **Frontend:** Sem alteração nesta sprint — permanece em Vinext/Cloudflare Workers indefinidamente
- **Banco/Schema:** Sem migration — mesma base Neon PostgreSQL com mesmos schemas Drizzle
- **Infra/Config:** `render.yaml`, `packages/backend/.env.example`, `package.json` raiz com workspaces
- **Docs:** `PHASE-018-nestjs-migration.md` atualizado com progresso; `MIGRATION-PLAN.md` com marco Sprint 018 atingido

---

## 10. Etapa 5 — Refatoração

### Objetivo
Após integration tests verdes, garantir que os limites entre camadas estejam nítidos no NestJS: Controllers finos, Guards coesos, módulos sem acoplamento cruzado desnecessário.

### Checklist
- [ ] Revisar todos os Controllers — confirmar que nenhum contém lógica de negócio inline
- [ ] Revisar `SessionGuard` — confirmar que `request.user` é derivado exclusivamente de `getSession()` server-side
- [ ] Revisar `DatabaseModule` — confirmar que nenhum repositório é importado diretamente nos Controllers (apenas via DI)
- [ ] Remover duplicação de configuração de CORS/Helmet se introduzida em múltiplos lugares
- [ ] Garantir que `ExceptionFilter` global cobre todos os `AppError` com o mesmo shape de resposta do Vinext
- [ ] Confirmar que `packages/backend/src/domain/` e `packages/backend/src/application/` não têm imports de `@nestjs/*`
- [ ] Garantir que todos os integration tests continuam verdes após refatoração

### Saída esperada
- Controllers com responsabilidade única de roteamento e delegação
- Guards testáveis isoladamente via mocks de contexto de execução
- `ApplicationModule` como único ponto de registro de use-cases
- Domain e application livres de qualquer decorator de framework

---

## 11. Etapa 6 — Validação, QA e Rollout

### Testes obrigatórios finais
- [ ] Executar `cd packages/backend && tsc --noEmit` — zero erros de tipo
- [ ] Executar `npm run test:integration` contra NestJS — 18 arquivos, 514 testes passando
- [ ] Executar `npm run lint:architecture` — sem violação de boundaries
- [ ] Executar `cd packages/backend && npm run build` — build de produção limpo
- [ ] Executar checklist manual de homologação (4 cenários abaixo)
- [ ] Validar deploy no Render com `DATABASE_URL` apontando para Neon PostgreSQL

### Comandos finais
```bash
cd packages/backend && tsc --noEmit
npm run test:integration
npm run lint:architecture
cd packages/backend && npm run build
```

### Rollout
- **Estratégia de deploy:** Deploy no Render como novo serviço independente. Vinext/Cloudflare Workers continua operando em paralelo durante toda a transição e permanece como o runtime de frontend definitivo. O NestJS backend é validado em paralelo sem impactar o fluxo de produção atual. A integração Vinext → NestJS ocorre na Sprint 019.
- **Uso de feature flag:** Não necessário para o backend NestJS isolado. A atualização do API client do Vinext para apontar ao NestJS ocorre apenas na Sprint 019.
- **Plano de monitoramento pós-release:** Verificar Render logs para erros de boot e de conexão com Neon. Observar latência de endpoints críticos (`/api/events`, `/api/orders`) nos primeiros 30 minutos.
- **Métricas a observar:** Taxa de resposta 200 em `/api/events`; ausência de erros de `tsc`; 514 integration tests passando.
- **Alertas esperados:** Erro de conexão com `DATABASE_URL` no boot se env vars não configuradas no Render.

### Responsáveis
- **Backend:** @jeandias
- **Frontend:** @jeandias (sem alteração nesta sprint)
- **QA:** @jeandias
- **Produto:** @jeandias
- **Release/Deploy:** @jeandias

### Janela de deploy
- **Horário recomendado:** Fora do horário de pico; após validação completa de integration tests
- **Tempo de monitoramento:** 30 minutos após deploy no Render

---

## 12. Checkpoints do Agent OS

- [ ] Checkpoint 1 — Discovery validado: todos os endpoints mapeados, contratos de DI definidos, gate Sprint 017 confirmado aprovado
- [ ] Checkpoint 2 — Estratégia de testes aprovada: 18 arquivos de integration tests identificados, casos de teste de guards definidos
- [ ] Checkpoint 3 — RED tests concluídos: integration tests adaptados falhando com `ECONNREFUSED`; unit tests de guards falhando com `Cannot find module`
- [ ] Checkpoint 4 — GREEN alcançado: caminho crítico NEST-001→NEST-019 completo, todos os testes passando
- [ ] Checkpoint 5 — Refatoração concluída: Controllers finos, Guards coesos, domain/application sem imports NestJS
- [ ] Checkpoint 6 — Validação final concluída: deploy Render funcional, `tsc --noEmit` limpo, 514 testes verdes

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
| `GET /api/events` no NestJS — mesmo resultado que no Vinext (parity test) | Lista de eventos com shape idêntico ao Vinext; HTTP 200 | Output JSON comparado lado a lado | ⬜ |
| `POST /api/orders` com auth customer via NestJS cria pedido corretamente | Pedido criado com `status: 'pending'` e `checkoutUrl` retornado; HTTP 201 | Log do banco + resposta da API | ⬜ |
| `POST /api/checkin` com auth checker no NestJS valida ticket ativo | Ticket marcado como usado; HTTP 200 com status de entrada | Log da transação + resposta da API | ⬜ |
| NestJS sobe no Render com `DATABASE_URL` e conecta ao Neon PostgreSQL | Boot sem erros; `/api/events` retorna HTTP 200 com dados reais | Log do Render + resposta do healthCheck | ⬜ |
| `SessionGuard` rejeita request sem sessão válida | HTTP 401 com body estruturado `{ error: 'Unauthorized' }` | Resposta da requisição sem cookie de sessão | ⬜ |
| Guard RBAC bloqueia customer acessando endpoint de organizer | HTTP 403 com body estruturado `{ error: 'Forbidden' }` | Resposta com token de customer em endpoint organizer | ⬜ |

---

## 14. Plano de Rollback

### Gatilhos
- Integration tests falhando em mais de 5% após deploy no Render
- Erro de conexão com Neon PostgreSQL persistente após configuração de env vars
- `tsc --noEmit` com erros de tipo em `packages/backend/` após refatoração
- Import acidental de Vinext ou Cloudflare detectado em domain/application pelo `lint:architecture`
- Comportamento divergente de endpoint entre NestJS e Vinext detectado em parity test

### Passos
1. Remover URL do serviço NestJS Render das configurações de acesso (frontend ainda aponta para Vinext — sem impacto para usuários)
2. Reverter commits de `packages/backend/` para versão estável anterior no branch
3. Executar `npm run test:integration` contra Vinext para confirmar que nenhuma regressão foi introduzida no monolito existente
4. Comunicar incidente e registrar causa provável no `docs/development/TASKS/PHASE-018-nestjs-migration.md`
5. Abrir task de pós-mortem se necessário

### Responsáveis
- **Execução técnica:** @jeandias
- **Revalidação:** @jeandias
- **Comunicação:** @jeandias

### RTO
- Até 30 minutos (reverter URL do frontend para Vinext é suficiente — NestJS opera como serviço paralelo sem impacto em produção)

---

## 15. Critérios de Aceite

- [ ] Todos os cenários críticos cobertos por testes (integration, unit guards, regression)
- [ ] Os testes de integração foram adaptados antes da implementação dos Controllers (TDD)
- [ ] A implementação atende ao comportamento esperado: NestJS com paridade exata de endpoints em relação ao Vinext
- [ ] Não houve regressão nos fluxos do monolito Vinext existente
- [ ] Domain e application em `packages/backend/src/` sem nenhum import de `@nestjs/*`, Vinext ou Cloudflare
- [ ] `tsc --noEmit` em `packages/backend/` limpo — sem erros de tipo
- [ ] `SessionGuard`, `RolesGuard` e `OwnershipGuard` testados e funcionais
- [ ] Webhook Stripe com raw body parser configurado e assinatura HMAC validada
- [ ] Checklist de homologação executado (6 cenários)
- [ ] Rollback definido: remover URL Render sem impacto em Vinext (até 30 minutos)
- [ ] `PHASE-018-nestjs-migration.md` atualizado com evidências de conclusão

---

## 16. Definition of Done

A sprint só pode ser considerada concluída quando:

- [ ] `packages/backend/` com NestJS completo, deployado e operacional no Render
- [ ] `tsc --noEmit` limpo em `packages/backend/` — zero erros de tipo
- [ ] 18 arquivos de integration tests passando 100% contra NestJS (514 testes)
- [ ] Domain e application portados sem nenhuma alteração de business logic
- [ ] Critérios de aceite atendidos
- [ ] Sem violação arquitetural crítica: domain/application framework-agnostic, Controllers finos, Guards coesos
- [ ] Sem blocker aberto
- [ ] `PHASE-018-nestjs-migration.md` e `MIGRATION-PLAN.md` atualizados com marco Sprint 018 atingido

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
